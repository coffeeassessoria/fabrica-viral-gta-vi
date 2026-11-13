import {sql,HttpError} from './database.js';
import {decrypt} from './security.js';
import {callProvider,providerName,type Provider} from './integrations.js';
type Tool={name:string;inputSchema:{properties?:Record<string,{type?:string;default?:unknown}>;required?:string[]}};
export async function mediaOperation(input:Record<string,unknown>,origin:string){
  const provider=providerName(input.provider),operation=String(input.operation);
  const allowed=provider==='kairogen'?['list_models','get_credits','estimate_cost','generate_video','get_generation']:['list_social_accounts','list_posts','create_post'];
  if(!allowed.includes(operation))throw new HttpError(400,'Operação inválida.');
  const rows=await sql()`SELECT payload FROM fv_connections WHERE provider=${provider}`;
  if(!rows[0])throw new HttpError(409,'Conecte sua conta primeiro.');
  const connection=decrypt<{tools?:Tool[]}>(rows[0].payload),tool=connection.tools?.find(t=>t.name===operation);
  if(!tool)throw new HttpError(409,'O serviço ainda não liberou esta função para a sua conexão.');
  const props=tool.inputSchema.properties||{},args:Record<string,unknown>={};
  const put=(aliases:string[],value:unknown)=>{const field=aliases.find(name=>name in props);if(field&&value!==undefined&&value!=='')args[field]=value;};
  if(provider==='kairogen'){
    put(['model','model_id','modelId'],input.model);put(['prompt','text'],input.prompt);put(['duration','duration_seconds','durationSeconds'],input.duration);put(['aspect_ratio','aspectRatio'],input.aspectRatio);put(['generation_id','generationId','id'],input.generationId);
    if(operation==='estimate_cost'){put(['type','media_type','generation_type'],'video');}
    put(['wait_for_completion'],false);
  }else{
    put(['text','caption'],input.caption);
    if(props.content?.type==='string')put(['content'],input.caption);
    put(['account_ids','accountIds','social_account_ids','socialAccountIds'],input.accountId?[input.accountId]:undefined);
    put(['account_id','accountId','social_account_id'],input.accountId);
    put(['scheduled_at','scheduledAt','scheduled_time','scheduledTime'],input.scheduledAt);
    put(['media_urls','mediaUrls'],input.mediaUrl?[input.mediaUrl]:undefined);
    put(['media_url','mediaUrl','video_url','videoUrl'],input.mediaUrl);
    put(['status'],input.scheduledAt?'scheduled':'draft');
  }
  for(const [key,property] of Object.entries(props)){if(!(key in args)&&property.default!==undefined)args[key]=property.default;}
  const missing=(tool.inputSchema.required||[]).filter(name=>!(name in args));
  if(missing.length)throw new HttpError(409,'Esta versão do serviço exige informações adicionais que o painel ainda não suporta. A operação não foi enviada; use o site do provedor e atualize a conexão.');
  // There is no direct publish-now action: create_post is sent as a draft unless explicitly scheduled.
  if(operation==='create_post'&&!input.scheduledAt && !('status' in args))throw new HttpError(409,'O serviço não confirmou suporte a rascunho. Defina uma data futura antes de agendar.');
  if(operation==='create_post' && input.scheduledAt && (!Number.isFinite(Date.parse(String(input.scheduledAt)))||Date.parse(String(input.scheduledAt))<Date.now()+60000))throw new HttpError(400,'Escolha um horário futuro para o agendamento.');
  return callProvider(provider as Provider,operation,args,input.confirmed===true,origin);
}
