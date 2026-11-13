export type PostingMode='draft'|'schedule'|'publish';
export type PublicationInput={accountId:string;platform?:string;caption:string;mediaUrl:string;mode:PostingMode;scheduledAt?:string};
export type JsonSchema={type?:string|string[];enum?:unknown[];properties?:Record<string,JsonSchema>;required?:string[];items?:JsonSchema;default?:unknown;anyOf?:JsonSchema[];oneOf?:JsonSchema[];$ref?:string;$defs?:Record<string,JsonSchema>;definitions?:Record<string,JsonSchema>};
export class PublicationError extends Error{constructor(public status:number,message:string){super(message);}}
function resolved(schema:JsonSchema,root:JsonSchema):JsonSchema{
  if(schema.$ref?.startsWith('#/')){let target:any=root;for(const part of schema.$ref.slice(2).split('/'))target=target?.[part.replace(/~1/g,'/').replace(/~0/g,'~')];if(target)return resolved(target,root);}
  const choices=schema.anyOf||schema.oneOf;
  return choices?resolved(choices.find(choice=>choice.type!=='null')||choices[0],root):schema;
}
function typed(schema:JsonSchema,type:string){return schema.type===type||(Array.isArray(schema.type)&&schema.type.includes(type));}
function cleanEnum(value:unknown){return String(value).toLowerCase().replace(/[^a-z]/g,'');}
function check(value:unknown,schema:JsonSchema,root:JsonSchema){
  schema=resolved(schema,root);
  if(schema.enum&&!schema.enum.includes(value))throw new PublicationError(409,'O formato exigido pelo HubPost precisa ser atualizado. Nenhuma publicação foi enviada.');
  if(typed(schema,'object')){if(!value||typeof value!=='object'||Array.isArray(value))throw new PublicationError(409,'O HubPost exige um formato adicional de publicação.');for(const name of schema.required||[])if((value as any)[name]===undefined)throw new PublicationError(409,'O HubPost exige informações adicionais antes de publicar. Nenhum envio foi feito.');for(const [name,item] of Object.entries(value as object))if(schema.properties?.[name])check(item,schema.properties[name],root);}
  if(typed(schema,'array')){if(!Array.isArray(value))throw new PublicationError(409,'Formato de mídia não suportado nesta conexão.');for(const item of value)if(schema.items)check(item,schema.items,root);}
  if(typed(schema,'string')&&typeof value!=='string')throw new PublicationError(409,'Campo de publicação em formato incompatível.');
  if(typed(schema,'boolean')&&typeof value!=='boolean')throw new PublicationError(409,'Opção de publicação em formato incompatível.');
}
export function validatePublication(input:PublicationInput){
  if(!input||!['draft','schedule','publish'].includes(input.mode)||typeof input.accountId!=='string'||!input.accountId.trim()||input.accountId.length>300||typeof input.caption!=='string'||!input.caption.trim()||input.caption.length>10000)throw new PublicationError(400,'Escolha a conta e informe a legenda antes de revisar.');
  let url:URL;try{url=new URL(input.mediaUrl);}catch{throw new PublicationError(400,'Informe o link HTTPS do vídeo final.');}
  if(url.protocol!=='https:'||url.username||url.password)throw new PublicationError(400,'O vídeo precisa de um link HTTPS compartilhável, sem credenciais no endereço.');
  if(input.mode==='schedule'&&(!input.scheduledAt||!Number.isFinite(Date.parse(input.scheduledAt))||Date.parse(input.scheduledAt)<Date.now()+60000))throw new PublicationError(400,'Escolha uma data futura para o agendamento.');
}
export function buildPublicationArguments(input:PublicationInput,rawSchema:JsonSchema){
  validatePublication(input);
  const root=rawSchema,schema=resolved(rawSchema,root),props=schema.properties||{};
  const args:Record<string,unknown>={};let modeMapped=false,mediaMapped=false,accountMapped=false,captionMapped=false;
  const put=(names:string[],value:unknown)=>{const key=names.find(name=>!!props[name]);if(key&&value!==undefined){args[key]=value;return key;}return undefined;};
  if(put(['account_ids','accountIds','social_account_ids','socialAccountIds'],[input.accountId]))accountMapped=true;
  if(put(['account_id','accountId','social_account_id','socialAccountId'],input.accountId))accountMapped=true;
  put(['platform','platform_name'],input.platform);
  if(put(['text','caption'],input.caption))captionMapped=true;
  const content=props.content&&resolved(props.content,root);
  if(content&&typed(content,'string')){args.content=input.caption;captionMapped=true;}
  if(content&&typed(content,'object')){const nested:Record<string,unknown>={};for(const key of ['text','caption','body'])if(content.properties?.[key]){nested[key]=input.caption;captionMapped=true;break;}args.content=nested;}
  if(put(['media_urls','mediaUrls','video_urls','videoUrls'],[input.mediaUrl]))mediaMapped=true;
  if(put(['media_url','mediaUrl','video_url','videoUrl'],input.mediaUrl))mediaMapped=true;
  if(props.media){const media=resolved(props.media,root),item=media.items&&resolved(media.items,root);if(typed(media,'array')&&item){if(typed(item,'string')){args.media=[input.mediaUrl];mediaMapped=true;}else if(typed(item,'object')){const entry:Record<string,unknown>={};const urlKey=['url','source_url','sourceUrl'].find(key=>item.properties?.[key]);if(urlKey){entry[urlKey]=input.mediaUrl;if(item.properties?.type){const type=resolved(item.properties.type,root);const video=type.enum?.find(value=>cleanEnum(value)==='video');if(video!==undefined)entry.type=video;}args.media=[entry];mediaMapped=true;}}}}
  for(const key of ['status','state','mode','publish_mode','publishMode']){
    if(!props[key])continue;const field=resolved(props[key],root);
    const desired=input.mode==='publish'?['published','publish','publishnow','postnow','immediate']:input.mode==='schedule'?['scheduled','schedule']:['draft'];
    const value=field.enum?.find(option=>desired.includes(cleanEnum(option)));
    if(value!==undefined){args[key]=value;modeMapped=true;}
  }
  for(const key of ['publish_now','publishNow','publish_immediately','publishImmediately'])if(props[key]&&typed(resolved(props[key],root),'boolean')){args[key]=input.mode==='publish';if(input.mode==='publish')modeMapped=true;}
  if(input.mode==='schedule'&&put(['scheduled_at','scheduledAt','scheduled_time','scheduledTime','publish_at','publishAt'],input.scheduledAt))modeMapped=true;
  if(!modeMapped)throw new PublicationError(409,'O HubPost ainda não confirmou suporte a esta modalidade de envio. Nenhuma publicação foi enviada.');
  if(!accountMapped||!captionMapped)throw new PublicationError(409,'O formato da conta ou da legenda ainda precisa ser validado nesta conexão. Nenhum envio foi feito.');
  if(!mediaMapped)throw new PublicationError(409,'Esta conexão do HubPost exige upload de mídia em vez de um link direto. A publicação não foi enviada; precisamos validar o recurso de upload da sua conta.');
  check(args,schema,root);
  return args;
}
