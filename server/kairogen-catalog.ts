import {HttpError} from './database.js';
import {check,type Tool} from './kairogen-contract.js';
export type SceneField={name:string;title:string;type:string;required:boolean;enum?:any[];default?:any;minimum?:number;maximum?:number;maxLength?:number};
export type SceneModel={key:string;name:string;mode:string|null;fields:SceneField[]};
const safeKey=(key:unknown):key is string=>typeof key==='string'&&/^[a-z][a-z0-9_]*$/i.test(key)&&!['constructor','prototype'].includes(key);
export function sceneModels(catalog:any,generate:Tool):SceneModel[]{
 if(!Array.isArray(catalog?.models))throw new HttpError(409,'O catálogo de modelos precisa ser atualizado antes de gerar.');
 return catalog.models.flatMap((m:any)=>{
  if(typeof m.model_key!=='string'||!Array.isArray(m.param_schema))return [];
  const modes=Object.entries(m.modes||{}) as [string,any][];
  const mode=modes.find(([k,v])=>k===m.default_mode&&v.resolved_mode==='text-to-video')?.[0]??modes.find(([,v])=>v.resolved_mode==='text-to-video')?.[0]??null;
  if(modes.length&&!mode)return [];
  const active=m.param_schema.filter((p:any)=>!p.modes||p.modes.includes(mode));
  if(active.some((p:any)=>p.required&&p.type==='file'))return [];
  const fields:SceneField[]=[];
  for(const p of active){
   if(!safeKey(p.key)||p.key==='prompt'||p.type==='file')continue;
   const values=Array.isArray(p.options)?p.options.filter((o:any)=>o.show!==false).map((o:any)=>o.value).filter((v:any)=>['string','number','boolean'].includes(typeof v)):undefined;
   const type=p.type==='boolean'?'boolean':p.type==='number'?'number':p.type==='select'&&values?.length?typeof values[0]:['text','textarea'].includes(p.type)?'string':null;
   if(!type){if(p.required)return [];continue;}
   const generic=p.key==='duration'?'duration_seconds':p.key;
   const name=generate.inputSchema.properties?.[generic]?generic:`extra_params.${p.key}`;
   if(name.startsWith('extra_params.')&&!generate.inputSchema.properties?.extra_params){if(p.required)return [];continue;}
   const field:SceneField={name,title:typeof p.label==='string'?p.label:p.key,type,required:!!p.required||!!values?.length||type==='boolean',...(values?.length?{enum:values}:{})};
   if(p.default!==undefined&&(!values||values.includes(p.default))&&typeof p.default===type)field.default=p.default;
   if(type==='number'){if(Number.isFinite(p.min))field.minimum=p.min;if(Number.isFinite(p.max))field.maximum=p.max;}
   if(type==='string'&&!values)field.maxLength=3000;
   fields.push(field);
  }
  if(!fields.some(f=>f.name==='duration_seconds')&&Array.isArray(m.supported_durations)&&m.supported_durations.length)fields.push({name:'duration_seconds',title:'Duração em segundos',type:'number',enum:m.supported_durations,required:true});
  return [{key:m.model_key,name:typeof m.name==='string'?m.name:m.model_key,mode,fields}];
 });
}
export function sceneParameters(generate:Tool,models:SceneModel[],input:Record<string,unknown>){
 const model=models.find(m=>m.key===input.model);if(!model)throw new HttpError(400,'Selecione um modelo disponível para gerar a partir de texto.');
 const fields=[{name:'prompt',title:'Descrição da cena',type:'string',required:true,maxLength:20000},...model.fields];
 const schema={type:'object',properties:Object.fromEntries(fields.map(f=>[f.name,{type:f.type,...(f.enum?{enum:f.enum}:{}),...(f.minimum!==undefined?{minimum:f.minimum}:{}),...(f.maximum!==undefined?{maximum:f.maximum}:{}),...(f.maxLength?{maxLength:f.maxLength}:{}),...(f.name==='prompt'?{minLength:1}:{})}])),required:fields.filter(f=>f.required).map(f=>f.name),additionalProperties:false};
 const {model:ignored,...values}=input;check({name:'scene',inputSchema:schema},values);
 const result:Record<string,any>={model:model.key,quantity:1,wait_for_completion:false};
 for(const [name,value] of Object.entries(values)){if(name.startsWith('extra_params.')){result.extra_params??={};result.extra_params[name.slice(13)]=value;}else result[name]=value;}
 if(model.mode&&generate.inputSchema.properties?.extra_params){result.extra_params??={};result.extra_params._mode=model.mode;}
 if(!generate.inputSchema.properties?.quantity)delete result.quantity;
 return check(generate,result);
}
