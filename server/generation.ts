import {randomUUID} from 'node:crypto';
import {loadWorkspace,sql,workspaceId,HttpError} from './database.js';
import {connectionTools,kairogenCall,refreshConnection} from './integrations.js';
import {validateProduction} from '../persistence/production.js';
import {contract,check,credits,editorial,generationArgs,generationResult,quoteArgs,scriptHash,statusArgs,payload,type Tool} from './kairogen-contract.js';
export type GenerationDependencies={tools:(origin:string)=>Promise<Tool[]>;call:(name:string,args:Record<string,unknown>,origin:string)=>Promise<any>};
const defaults:GenerationDependencies={tools:async(origin)=>{await refreshConnection('kairogen',origin);return connectionTools('kairogen');},call:kairogenCall};
export const generationSchema=[
 `CREATE TABLE IF NOT EXISTS fv_script_approvals(workspace_id text NOT NULL,item_id text NOT NULL,script_hash text NOT NULL,approved_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(workspace_id,item_id))`,
 `CREATE TABLE IF NOT EXISTS fv_generation_jobs(id uuid PRIMARY KEY,workspace_id text NOT NULL,item_id text NOT NULL,script_hash text NOT NULL,status text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`
];
export async function generationOperation(input:Record<string,any>,origin:string,deps=defaults){
 const db=sql(),wid=workspaceId();
 const current=async()=>{
  const loaded=await loadWorkspace();const item=loaded.state?.production?.find(x=>x.id===input.itemId);
  if(!item)throw new HttpError(404,'Roteiro não encontrado.');
  if(input.item){const local=validateProduction([input.item])[0];if(scriptHash(local)!==scriptHash(item))throw new HttpError(409,'Salve as edições do roteiro antes de aprovar ou gerar.');}
  return {item,hash:scriptHash(item),revision:loaded.revision};
 };
 const approved=async()=>{const value=await current();const [a]=await db`SELECT script_hash FROM fv_script_approvals WHERE workspace_id=${wid} AND item_id=${input.itemId}`;
  if(a?.script_hash!==value.hash)throw new HttpError(409,'Aprove a versão atual do roteiro antes de consultar o custo.');return value;};
 const job=async()=>{if(typeof input.jobId!=='string'||!/^[0-9a-f-]{36}$/i.test(input.jobId))throw new HttpError(400,'Geração inválida.');
  const [j]=await db`SELECT * FROM fv_generation_jobs WHERE workspace_id=${wid} AND id=${input.jobId}::uuid`;
  if(!j)throw new HttpError(404,'Geração não encontrada.');return j;};
 const view=(j:any)=>({id:j.id,itemId:j.item_id,status:j.status,createdAt:j.created_at,updatedAt:j.updated_at,cost:j.payload.cost,expiresAt:j.payload.expiresAt,parameters:j.payload.parameters,urls:j.payload.urls||[],externalId:j.payload.externalId||null});
 if(input.operation==='list'){
  const jobs=await db`SELECT * FROM fv_generation_jobs WHERE workspace_id=${wid} ORDER BY created_at DESC LIMIT 100`;
  const approvals=await db`SELECT item_id,script_hash,approved_at FROM fv_script_approvals WHERE workspace_id=${wid}`;
  const ws=await loadWorkspace();return {jobs:jobs.map(view),approvedSnapshots:Object.fromEntries((ws.state?.production||[]).filter(p=>approvals.some(a=>a.item_id===p.id&&a.script_hash===scriptHash(p))).map(p=>[p.id,JSON.stringify(editorial(p))])),approvedIds:approvals.filter(a=>ws.state?.production?.some(p=>p.id===a.item_id&&scriptHash(p)===a.script_hash)).map(a=>a.item_id)};
 }
 if(input.operation==='approve'){
  if(input.confirmed!==true)throw new HttpError(400,'Confirme a aprovação do roteiro.');
  const c=await current();if(!c.item.title.trim()||!c.item.script.trim())throw new HttpError(400,'Preencha o título e o roteiro.');
  const rows=await db`INSERT INTO fv_script_approvals(workspace_id,item_id,script_hash) SELECT ${wid},${input.itemId},${c.hash} WHERE EXISTS(SELECT 1 FROM fv_workspace WHERE id=${wid} AND revision=${c.revision}) ON CONFLICT(workspace_id,item_id) DO UPDATE SET script_hash=excluded.script_hash,approved_at=now() RETURNING item_id`;
  if(!rows.length)throw new HttpError(409,'O roteiro mudou. Recarregue e revise.');return {approved:true};
 }
 if(input.operation==='revoke'){
  await db`DELETE FROM fv_script_approvals WHERE workspace_id=${wid} AND item_id=${input.itemId}`;
  await db`UPDATE fv_generation_jobs SET status='expired',updated_at=now() WHERE workspace_id=${wid} AND item_id=${input.itemId} AND status='quoted'`;
  return {revoked:true};
 }
 if(input.operation==='capabilities'){
  const tools=await deps.tools(origin);const c=contract(tools);
  // Form is derived from advertised scalar fields; no arbitrary JSON editor or hidden defaults.
  const properties=c.generate.inputSchema.properties||{};
  const fields=Object.entries(properties).filter(([k])=>k!=='wait_for_completion').map(([name,schema]:[string,any])=>({name,...schema,required:(c.generate.inputSchema.required||[]).includes(name)}));
  if(fields.some((f:any)=>f.required&&!['string','number','integer','boolean'].includes(f.type)))throw new HttpError(409,'Este modelo exige referências estruturadas ainda não suportadas no painel.');
  const read=async(name:string,args:Record<string,unknown>)=>{const tool=tools.find(t=>t.name===name);if(!tool)return null;check(tool,args);return payload(await deps.call(name,args,origin));};
  const [catalog,account]=await Promise.all([read('list_models',{type:'video'}),read('get_credits',{})]);
  return {fields:fields.filter((f:any)=>['string','number','integer','boolean'].includes(f.type)),catalog,account,tools:tools.filter(t=>['generate_video','estimate_cost','get_generation','list_models','get_credits'].includes(t.name))};
 }
 if(input.operation==='quote'){
  const c=await approved();const active=await db`SELECT id FROM fv_generation_jobs WHERE workspace_id=${wid} AND item_id=${input.itemId} AND status IN ('sending','processing','uncertain') LIMIT 1`;
  if(active.length)throw new HttpError(409,'Existe uma geração em andamento ou sem confirmação. Confira o resultado antes de preparar outra.');
  const spec=contract(await deps.tools(origin));const parameters=generationArgs(spec.generate,input.parameters);
  const cost=credits(await deps.call(spec.quote.name,quoteArgs(spec.quote,parameters),origin));
  const now=await approved();if(now.hash!==c.hash)throw new HttpError(409,'O roteiro mudou durante a consulta. Revise novamente.');
  const id=randomUUID(),data={parameters,cost,expiresAt:new Date(Date.now()+10*60000).toISOString(),contractHash:spec.fingerprint,script:editorial(c.item)};
  // Unique quote owns one explicit paid intent. It is never resent after an uncertain response.
  await db`INSERT INTO fv_generation_jobs(id,workspace_id,item_id,script_hash,status,payload) VALUES(${id},${wid},${input.itemId},${c.hash},'quoted',${JSON.stringify(data)}::jsonb)`;
  return view((await db`SELECT * FROM fv_generation_jobs WHERE id=${id}`)[0]);
 }
 if(input.operation==='generate'){
  if(input.confirmed!==true)throw new HttpError(400,'Confirme o custo e a cena antes de gerar.');
  const j=await job();input.itemId=j.item_id;
  if(j.status!=='quoted')return view(j);
  const c=await approved();
  if(c.hash!==j.script_hash||Date.parse(j.payload.expiresAt)<Date.now())throw new HttpError(409,'A cotação expirou ou o roteiro mudou. Consulte o custo novamente.');
  const spec=contract(await deps.tools(origin));if(spec.fingerprint!==j.payload.contractHash)throw new HttpError(409,'O contrato da KAIROGEN mudou. Consulte o custo novamente.');
  check(spec.generate,j.payload.parameters);
  const latest=credits(await deps.call(spec.quote.name,quoteArgs(spec.quote,j.payload.parameters),origin));
  if(latest!==j.payload.cost){await db`UPDATE fv_generation_jobs SET status='expired',updated_at=now() WHERE id=${j.id} AND status='quoted'`;throw new HttpError(409,'O custo mudou. Consulte e aprove uma nova cotação.');}
  const final=await approved();if(final.hash!==j.script_hash)throw new HttpError(409,'O roteiro mudou. Aprove novamente.');
  const claimed=await db`UPDATE fv_generation_jobs SET status='sending',updated_at=now() WHERE id=${j.id} AND workspace_id=${wid} AND status='quoted' AND EXISTS(SELECT 1 FROM fv_workspace WHERE id=${wid} AND revision=${final.revision}) AND EXISTS(SELECT 1 FROM fv_script_approvals WHERE workspace_id=${wid} AND item_id=${j.item_id} AND script_hash=${j.script_hash}) RETURNING id`;
  if(!claimed.length)return view(await job());
  // A send is attempted at most once for this quote, including process failure or double-click.
  try{
   const raw=await deps.call(spec.generate.name,j.payload.parameters,origin);
   const response=generationResult(raw);
   if(!response.externalId&&response.status!=='completed'&&response.status!=='failed')throw new Error('Missing external ID');
   const updated={...j.payload,...response};
   await db`UPDATE fv_generation_jobs SET status=${response.status},payload=${JSON.stringify(updated)}::jsonb,updated_at=now() WHERE id=${j.id}`;
  }catch{
   await db`UPDATE fv_generation_jobs SET status='uncertain',updated_at=now() WHERE id=${j.id} AND status='sending'`;
   throw new HttpError(502,'Envio sem confirmação. Não reenvie: confira o histórico na KAIROGEN. Esta confirmação não será executada outra vez.');
  }
  return view(await job());
 }
 if(input.operation==='refresh'){
  const j=await job();if(!j.payload.externalId)return view(j);
  const spec=contract(await deps.tools(origin));
  const response=generationResult(await deps.call(spec.status.name,statusArgs(spec.status,j.payload.externalId),origin));
  if(response.externalId&&response.externalId!==j.payload.externalId)throw new HttpError(502,'A consulta retornou outra geração.');
  if(j.status==='failed'||(j.status==='completed'&&response.status!=='completed'))return view(j);
  const updated={...j.payload,...response,externalId:j.payload.externalId};
  await db`UPDATE fv_generation_jobs SET status=${response.status},payload=${JSON.stringify(updated)}::jsonb,updated_at=now() WHERE id=${j.id} AND status IN ('processing','sending','uncertain','completed')`;
  return view(await job());
 }
 throw new HttpError(400,'Operação de geração inválida.');
}
