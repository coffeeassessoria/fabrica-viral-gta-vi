import {createHash} from 'node:crypto';
import {AjvJsonSchemaValidator} from '@modelcontextprotocol/sdk/validation/ajv';
import {HttpError} from './database.js';
import type {ProductionItem} from '../persistence/production.js';
export type Tool={name:string;description?:string;inputSchema:Record<string,any>};
const validator=new AjvJsonSchemaValidator();
export const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const editorial=(p:ProductionItem)=>({id:p.id,title:p.title,hook:p.hook,script:p.script,caption:p.caption,hashtags:p.hashtags});
export const scriptHash=(p:ProductionItem)=>digest(editorial(p));
export function payload(result:any):any{
 if(result?.isError)throw new HttpError(502,'A KAIROGEN recusou a operação. Confira a conexão e os parâmetros.');
 if(result?.structuredContent)return result.structuredContent;
 for(const block of result?.content||[])if(block.type==='text'){try{return JSON.parse(block.text);}catch{/* Not a structured contract. */}}
 throw new HttpError(409,'O retorno da KAIROGEN precisa de adaptação. Nenhuma resposta textual será interpretada como custo ou vídeo.');
}
export function check(tool:Tool,args:Record<string,unknown>){
 const keys=Object.keys(tool.inputSchema.properties||{});
 if(Object.keys(args).some(k=>!keys.includes(k)))throw new HttpError(400,'Parâmetro não reconhecido pela KAIROGEN.');
 try{if(!validator.getValidator(tool.inputSchema)(args).valid)throw new Error();}catch{throw new HttpError(400,'Confira os parâmetros exigidos pelo modelo.');}
 return args;
}
export function contract(tools:Tool[]){
 const find=(name:string)=>tools.find(t=>t.name===name);
 const generate=find('generate_video'),quote=find('estimate_cost'),status=find('get_generation');
 if(!generate||!quote||!status)throw new HttpError(409,'A conexão ainda não anunciou geração, cotação e consulta compatíveis. Atualize a conexão para validar o contrato.');
 const props=generate.inputSchema.properties||{};
 if(props.wait_for_completion?.type!=='boolean'||props.prompt?.type!=='string')throw new HttpError(409,'O envio assíncrono deste contrato ainda precisa ser adaptado. Geração bloqueada.');
 return {generate,quote,status,fingerprint:digest([generate,quote,status])};
}
export function generationArgs(tool:Tool,input:unknown){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new HttpError(400,'Informe o plano da cena.');
 const args:Record<string,unknown>={...input as Record<string,unknown>,wait_for_completion:false};
 if(typeof args.prompt!=='string'||!args.prompt.trim()||args.prompt.length>20000)throw new HttpError(400,'Descreva a cena a gerar.');
 return check(tool,args);
}
export function quoteArgs(tool:Tool,args:Record<string,unknown>,context:Record<string,unknown>={}){
 const props=tool.inputSchema.properties||{};
 const omitted=Object.keys(args).filter(k=>!(k in props)&&!['prompt','negative_prompt','seed','wait_for_completion'].includes(k));
 if(omitted.length)throw new HttpError(409,'A cotação não cobre todos os parâmetros desta cena. O contrato precisa ser adaptado antes de gerar.');
 const mapped=Object.fromEntries(Object.entries(args).filter(([k])=>k in props));
 // No guessed model, type or duration defaults: unknown required fields block submission.
 return check(tool,{...mapped,...(context.plan_key!==undefined?{plan_key:context.plan_key}:{})});
}
export function credits(result:unknown){
 const p=payload(result);const value=p.credit_cost??p.credits??p.cost_credits??p.estimated_credits;
 if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new HttpError(409,'O serviço não retornou um custo numérico em créditos reconhecido. Geração bloqueada.');
 return value;
}
export function statusArgs(tool:Tool,id:string){
 const props=tool.inputSchema.properties||{};const key=['generation_id','generationId','id'].find(k=>props[k]?.type==='string');
 if(!key)throw new HttpError(409,'Consulta de geração ainda não compatível.');
 return check(tool,{[key]:id});
}
export function generationResult(result:unknown){
 const p=payload(result);const id=p.generation_id??p.generationId??p.id;
 const state=String(p.status||'').toLowerCase();
 const candidates=[...(Array.isArray(p.output_urls)?p.output_urls:[]),p.video_url,p.videoUrl,p.output_url,p.url,...(Array.isArray(p.outputs)?p.outputs.map((x:any)=>typeof x==='string'?x:x?.url):[])];
 const urls=candidates.filter((v):v is string=>{if(typeof v!=='string')return false;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}});
 const failed=['failed','error','cancelled','canceled'].includes(state);
 const complete=['completed','complete','succeeded','success','done'].includes(state);
 const shape=(obj:any,prefix='',depth=0):string[]=>obj&&typeof obj==='object'&&depth<3?Object.entries(obj).filter(([k])=>/^[a-zA-Z_]{1,60}$/.test(k)).slice(0,30).flatMap(([k,v])=>[prefix+k+':'+(Array.isArray(v)?'array':typeof v),...shape(v,prefix+k+'.',depth+1)]):[];
 const responseShape=shape(p);
 const providerStatus=['queued','pending','processing','completed','complete','succeeded','success','done','failed','error','cancelled','canceled'].includes(state)?state:'unrecognized';
 return {providerStatus,responseShape,externalId:typeof id==='string'&&id.length<=300?id:null,status:failed?'failed':complete&&urls.length?'completed':'processing',urls:complete?urls:[]} as const;
}
