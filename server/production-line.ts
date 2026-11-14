import {randomUUID} from 'node:crypto';
import {sql,workspaceId,loadWorkspace,HttpError} from './database.js';
import {generationDefaults,type GenerationDependencies} from './generation.js';
import {scriptScenes} from '../persistence/scenes.js';
import {sceneModels,sceneParameters} from './kairogen-catalog.js';
import {contract,check,credits,editorial,scriptHash,quoteArgs,payload,generationResult,statusArgs} from './kairogen-contract.js';

export const lineSchema=[`CREATE TABLE IF NOT EXISTS fv_production_batches(id uuid PRIMARY KEY,workspace_id text NOT NULL,item_id text NOT NULL,script_hash text NOT NULL,status text NOT NULL,payload jsonb NOT NULL,lease_id uuid,lease_until timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
 `CREATE UNIQUE INDEX IF NOT EXISTS fv_one_active_batch ON fv_production_batches(workspace_id,item_id) WHERE status IN ('queued','running','paused','review')`];
const active=['queued','running'];
const view=(b:any)=>({id:b.id,itemId:b.item_id,status:b.status,createdAt:b.created_at,...b.payload});
export type Dispatch=(batchId:string)=>Promise<void>;
async function batch(id:unknown){
 if(typeof id!=='string'||!/^[\da-f-]{36}$/i.test(id))throw new HttpError(400,'Produção inválida.');
 const [b]=await sql()`SELECT * FROM fv_production_batches WHERE id=${id}::uuid AND workspace_id=${workspaceId()}`;
 if(!b)throw new HttpError(404,'Produção não encontrada.');return b;
}
async function saved(itemId:string){const ws=await loadWorkspace(),item=ws.state?.production?.find(i=>i.id===itemId);if(!item)throw new HttpError(404,'Roteiro não encontrado.');return {item,hash:scriptHash(item),revision:ws.revision};}

export async function lineOperation(input:Record<string,any>,origin:string,dispatch:Dispatch,deps=generationDefaults){
 const db=sql(),wid=workspaceId();
 if(input.operation==='worker-check'){
  const id=randomUUID();await db`INSERT INTO fv_production_batches(id,workspace_id,item_id,script_hash,status,payload) VALUES(${id},${wid},'__worker_probe__','','probe','{}'::jsonb)`;
  await dispatch(id);return {id};
 }
 if(input.operation==='worker-status'){const b=await batch(input.batchId);return {received:!!b.payload.receivedAt};}
 if(input.operation==='list'){
  const rows=await db`SELECT * FROM fv_production_batches WHERE workspace_id=${wid} AND status<>'probe' ORDER BY created_at DESC LIMIT 60`;
  const jobs=await db`SELECT id,item_id,status,payload,created_at FROM fv_generation_jobs WHERE workspace_id=${wid} AND status NOT IN ('quoted','expired') ORDER BY created_at DESC LIMIT 100`;
  return {batches:rows.map(view),jobs:jobs.map(j=>({id:j.id,itemId:j.item_id,status:j.status,batchId:j.payload.batchId,sceneLabel:j.payload.sceneLabel,cost:j.payload.cost,urls:j.payload.urls||[],externalId:j.payload.externalId,providerStatus:j.payload.providerStatus,responseShape:j.payload.responseShape,createdAt:j.created_at}))};
 }
 if(input.operation==='quote'){
  const current=await saved(input.itemId);
  if(input.scriptSnapshot!==JSON.stringify(editorial(current.item)))throw new HttpError(409,'Salve e revise a versão atual antes de calcular.');
  const existing=await db`SELECT id FROM fv_production_batches WHERE workspace_id=${wid} AND item_id=${input.itemId} AND status IN ('queued','running','paused','review') LIMIT 1`;
  if(existing.length)throw new HttpError(409,'Este episódio já está na linha. Acompanhe a produção abaixo.');
  const pending=await db`SELECT id FROM fv_generation_jobs WHERE workspace_id=${wid} AND item_id=${input.itemId} AND status IN ('sending','processing','uncertain') LIMIT 1`;
  if(pending.length)throw new HttpError(409,'Há uma cena anterior sem resultado final. Consulte essa cena abaixo antes de iniciar um episódio completo.');
  const scenes=scriptScenes(current.item.script);
  const lines=current.item.script.split(/\r?\n/),header=lines.findIndex(l=>/^\s*\|\s*Tempo\s*\|/i.test(l));
  const rows:string[]=[];if(header>=0)for(const line of lines.slice(header+1)){if(!line.trim().startsWith('|'))break;if(!/^\s*\|[\s:|\-]+$/.test(line))rows.push(line);}
  if(header<0||rows.length!==scenes.length)throw new HttpError(400,'Há cenas sem tempo ou campos reconhecidos. Revise a tabela antes de produzir o episódio.');
  if(!scenes.length||scenes.length>12||scenes.some(s=>!s.duration))throw new HttpError(400,'A linha precisa de 1 a 12 cenas com tempo, imagem/ação e fala/som na tabela do roteiro. Edite o roteiro antes de continuar.');
  const tools=await deps.tools(origin),spec=contract(tools);
  const catalog=tools.find(t=>t.name==='list_models');if(!catalog)throw new HttpError(409,'Catálogo indisponível.');
  const models=sceneModels(payload(await deps.call('list_models',check(catalog,{type:'video'}),origin)),spec.generate);
  // An explicit product preset; availability and every field are validated against the live catalog.
  const model=models.find(m=>m.key==='veo3-1-lite');if(!model)throw new HttpError(409,'Veo 3.1 Lite indisponível. Use a geração avulsa ou aguarde o catálogo.');
  const durations=(model.fields.find(f=>f.name==='duration_seconds')?.enum||[]).filter((n:any)=>typeof n==='number').sort((a:number,b:number)=>a-b);
  const quoteCache=new Map<string,Promise<number>>();
  const prepared=scenes.map(scene=>{
   const duration=durations.find(n=>n>=scene.duration!);if(!duration)throw new HttpError(409,'Uma cena excede a duração do modelo. Divida esse trecho no roteiro.');
   const values:Record<string,unknown>={model:model.key,prompt:scene.prompt,...Object.fromEntries(model.fields.filter(f=>f.default!==undefined).map(f=>[f.name,f.default]))};
   for(const field of model.fields){const key=field.name.replace('extra_params.','');if(key==='resolution')values[field.name]='720p';if(key==='aspect_ratio')values[field.name]='9:16';if(['audio','generate_audio'].includes(key))values[field.name]=true;}
   values.duration_seconds=duration;
   const parameters=sceneParameters(spec.generate,models,values),args=quoteArgs(spec.quote,parameters,{plan_key:'pro'}),key=JSON.stringify(args);
   if(!quoteCache.has(key))quoteCache.set(key,deps.call('estimate_cost',args,origin).then(credits));
   return {jobId:randomUUID(),label:scene.label,prompt:scene.prompt,scriptDuration:scene.duration,duration,parameters,key};
  });
  const quoted=await Promise.all(prepared.map(async({key,...s})=>({...s,cost:await quoteCache.get(key)!})));
  const latest=await saved(input.itemId);if(latest.hash!==current.hash)throw new HttpError(409,'O roteiro mudou durante a consulta. Calcule novamente.');
  const id=randomUUID(),data={title:current.item.title,scriptSnapshot:JSON.stringify(editorial(current.item)),model:'Veo 3.1 Lite',planKey:'pro',resolution:'720p',aspectRatio:'9:16',scenes:quoted,total:quoted.reduce((n,s)=>n+s.cost,0),expiresAt:new Date(Date.now()+10*60000).toISOString(),contractHash:spec.fingerprint,reason:''};
  await db`INSERT INTO fv_production_batches(id,workspace_id,item_id,script_hash,status,payload) VALUES(${id},${wid},${input.itemId},${current.hash},'quoted',${JSON.stringify(data)}::jsonb)`;
  return view(await batch(id));
 }
 const b=await batch(input.batchId);
 if(input.operation==='start'){
  if(input.confirmed!==true)throw new HttpError(400,'Aprove o roteiro e o orçamento total antes de iniciar.');
  if(b.status!=='quoted')return view(b);
  if(Date.parse(b.payload.expiresAt)<Date.now())throw new HttpError(409,'Cotação expirada. Calcule novamente.');
  const current=await saved(b.item_id);if(current.hash!==b.script_hash)throw new HttpError(409,'O roteiro mudou. Revise e calcule novamente.');
  const approvedAt=new Date().toISOString();
  // Atomic approval + job creation. A partial request cannot start a partially approved episode.
  try{await db.transaction([
   db`UPDATE fv_production_batches SET status='queued',payload=payload||${JSON.stringify({approvedAt,deadline:new Date(Date.now()+24*3600000).toISOString()})}::jsonb,updated_at=now() WHERE id=${b.id} AND workspace_id=${wid} AND status='quoted' AND EXISTS(SELECT 1 FROM fv_workspace WHERE id=${wid} AND revision=${current.revision}) AND NOT EXISTS(SELECT 1 FROM fv_generation_jobs WHERE workspace_id=${wid} AND item_id=${b.item_id} AND status IN ('sending','processing','uncertain'))`,
   db`INSERT INTO fv_script_approvals(workspace_id,item_id,script_hash) SELECT ${wid},${b.item_id},${b.script_hash} WHERE EXISTS(SELECT 1 FROM fv_production_batches WHERE id=${b.id} AND status='queued') ON CONFLICT(workspace_id,item_id) DO UPDATE SET script_hash=excluded.script_hash,approved_at=now()`,
   ...b.payload.scenes.map((s:any)=>db`INSERT INTO fv_generation_jobs(id,workspace_id,item_id,script_hash,status,payload) SELECT ${s.jobId},${wid},${b.item_id},${b.script_hash},'quoted',${JSON.stringify({parameters:s.parameters,cost:s.cost,planKey:b.payload.planKey,batchId:b.id,sceneLabel:s.label,contractHash:b.payload.contractHash})}::jsonb WHERE EXISTS(SELECT 1 FROM fv_production_batches WHERE id=${b.id} AND status='queued') ON CONFLICT(id) DO NOTHING`)
  ]);}catch{throw new HttpError(409,'Já existe uma produção deste roteiro. Atualize a linha para acompanhar.');}
  const updated=await batch(b.id);if(updated.status!=='queued')throw new HttpError(409,'O roteiro mudou ou há uma cena em andamento. Atualize antes de iniciar.');
  try{await dispatch(b.id);}catch{throw new HttpError(503,'Aprovação salva, mas a fila não respondeu. Use Retomar acompanhamento; não é preciso aprovar ou pagar novamente.');}
  return view(updated);
 }
 if(input.operation==='resume'){
  if(!['queued','running','paused'].includes(b.status))return view(b);
  const current=await saved(b.item_id);if(current.hash!==b.script_hash)throw new HttpError(409,'O roteiro mudou. Esta aprovação não permite gerar a nova versão.');
  if(Date.parse(b.payload.deadline)<Date.now())throw new HttpError(409,'A autorização de produção venceu. Os vídeos existentes foram preservados.');
  await db`UPDATE fv_production_batches SET status='queued',payload=payload||'{"reason":""}'::jsonb,updated_at=now() WHERE id=${b.id} AND status IN ('queued','running','paused')`;
  await dispatch(b.id);return view(await batch(b.id));
 }
 if(input.operation==='pause'){
  await db`UPDATE fv_production_batches SET status='paused',payload=payload||'{"reason":"Pausado por você. Uma cena já enviada pode terminar e consumir os créditos aprovados."}'::jsonb,updated_at=now() WHERE id=${b.id} AND status IN ('queued','running')`;return view(await batch(b.id));
 }
 if(input.operation==='cancel'){
  if(input.confirmed!==true)throw new HttpError(400,'Confirme o encerramento da fila.');
  await db`UPDATE fv_production_batches SET status='cancelled',payload=payload||'{"reason":"Produção encerrada por você. Resultados preservados; uma cena já enviada ainda pode terminar."}'::jsonb,updated_at=now() WHERE id=${b.id} AND status IN ('queued','running','paused','review')`;return view(await batch(b.id));
 }
 if(input.operation==='finish'){
  if(input.confirmed!==true||b.status!=='review')throw new HttpError(400,'Assista às cenas antes de concluir a revisão.');
  await db`UPDATE fv_production_batches SET status='approved',updated_at=now() WHERE id=${b.id} AND status='review'`;return view(await batch(b.id));
 }
 throw new HttpError(400,'Operação da linha inválida.');
}

// One small durable step per delivery. Only a claimed, never-sent job can incur cost.
export async function productionTick(id:string,origin:string,deps:GenerationDependencies=generationDefaults):Promise<boolean>{
 const db=sql(),wid=workspaceId(),lease=randomUUID();
 const probe=await batch(id);if(probe.status==='probe'){await db`UPDATE fv_production_batches SET payload=jsonb_build_object('receivedAt',now()) WHERE id=${id}::uuid AND workspace_id=${wid} AND status='probe'`;return false;}
 const [b]=await db`UPDATE fv_production_batches SET lease_id=${lease},lease_until=now()+interval '120 seconds' WHERE id=${id}::uuid AND workspace_id=${wid} AND status IN ('queued','running') AND (lease_until IS NULL OR lease_until<now()) RETURNING *`;
 if(!b)return active.includes((await batch(id)).status);
 const pause=async(reason:string)=>{await db`UPDATE fv_production_batches SET status='paused',payload=payload||${JSON.stringify({reason})}::jsonb,updated_at=now() WHERE id=${b.id} AND lease_id=${lease} AND status IN ('queued','running')`;return false;};
 try{
  if(!b.payload.approvedAt)return pause('Aprovação do orçamento não encontrada. Nenhuma cena foi enviada.');
  if(Date.parse(b.payload.deadline)<Date.now())return pause('A produção passou de 24 horas. Confira os resultados antes de continuar.');
  const current=await saved(b.item_id);
  const [a]=await db`SELECT script_hash FROM fv_script_approvals WHERE workspace_id=${wid} AND item_id=${b.item_id}`;
  if(current.hash!==b.script_hash||a?.script_hash!==b.script_hash)return pause('O roteiro foi alterado ou teve a aprovação retirada. Os vídeos já enviados foram preservados.');
  const jobs=await db`SELECT * FROM fv_generation_jobs WHERE workspace_id=${wid} AND payload->>'batchId'=${b.id}`;
  const ordered=b.payload.scenes.map((s:any)=>jobs.find(j=>j.id===s.jobId));
  if(ordered.some((j:any)=>!j))return pause('Faltam registros da produção. Nenhum envio será recriado automaticamente.');
  const j=ordered.find((j:any)=>j.status!=='completed');
  if(!j){await db`UPDATE fv_production_batches SET status='review',payload=payload||'{"reason":"Todas as cenas foram recebidas. Assista e revise a continuidade antes da montagem."}'::jsonb,updated_at=now() WHERE id=${b.id} AND status IN ('queued','running')`;return false;}
  if(['sending','uncertain','failed','expired'].includes(j.status))return pause('Uma cena falhou ou ficou sem confirmação. Consulte o resultado na KAIROGEN; a fila não repetirá esse envio.');
  const spec=contract(await deps.tools(origin));
  if(j.status==='processing'){
   if(!j.payload.externalId)return pause('Cena sem identificador de acompanhamento. Confira a KAIROGEN antes de continuar.');
   const response=generationResult(await deps.call(spec.status.name,statusArgs(spec.status,j.payload.externalId),origin));
   if(response.externalId&&response.externalId!==j.payload.externalId)return pause('A consulta retornou uma geração diferente.');
   await db`UPDATE fv_generation_jobs SET status=${response.status},payload=payload||${JSON.stringify({...response,externalId:j.payload.externalId})}::jsonb,updated_at=now() WHERE id=${j.id} AND status='processing'`;
   if(response.status==='failed')return pause('A KAIROGEN informou falha nesta cena. Repetir uma geração exige nova aprovação.');
   if(response.status==='processing'&&Date.now()-Date.parse(j.payload.sentAt)>45*60000)return pause('A KAIROGEN ainda não entregou esta cena após 45 minutos. Use Retomar acompanhamento para consultar, sem reenviar.');
   return true;
  }
  if(j.status!=='quoted')return pause('Estado de cena não reconhecido. Confira a produção.');
  if(spec.fingerprint!==b.payload.contractHash)return pause('O contrato da KAIROGEN mudou. O orçamento precisa de nova revisão.');
  const cost=credits(await deps.call(spec.quote.name,quoteArgs(spec.quote,j.payload.parameters,{plan_key:b.payload.planKey}),origin));
  if(cost!==j.payload.cost)return pause('O preço de uma cena mudou. A fila parou antes de gastar fora do orçamento aprovado.');
  const total=ordered.reduce((n:number,x:any)=>n+x.payload.cost,0);if(total!==b.payload.total)return pause('O orçamento não corresponde às cenas. Geração bloqueada.');
  const parameters=check(spec.generate,{...j.payload.parameters,...(spec.generate.inputSchema.properties?.expected_credits?{expected_credits:cost}:{})});
  const final=await saved(b.item_id);if(final.hash!==b.script_hash)return pause('O roteiro mudou antes do envio. Revise a versão atual.');
  const claimed=await db`UPDATE fv_generation_jobs SET status='sending',payload=payload||${JSON.stringify({sentAt:new Date().toISOString()})}::jsonb,updated_at=now() WHERE id=${j.id} AND workspace_id=${wid} AND status='quoted' AND EXISTS(SELECT 1 FROM fv_production_batches WHERE id=${b.id} AND lease_id=${lease} AND lease_until>now() AND status IN ('queued','running')) AND EXISTS(SELECT 1 FROM fv_workspace WHERE id=${wid} AND revision=${final.revision}) AND EXISTS(SELECT 1 FROM fv_script_approvals WHERE workspace_id=${wid} AND item_id=${b.item_id} AND script_hash=${b.script_hash}) RETURNING id`;
  if(!claimed.length)return true;
  await db`UPDATE fv_production_batches SET status='running',updated_at=now() WHERE id=${b.id} AND status='queued'`;
  try{
   const response=generationResult(await deps.call(spec.generate.name,parameters,origin));
   if(!response.externalId&&response.status==='processing')throw new Error('Unconfirmed send');
   await db`UPDATE fv_generation_jobs SET status=${response.status},payload=payload||${JSON.stringify(response)}::jsonb,updated_at=now() WHERE id=${j.id} AND status='sending'`;
   if(response.status==='failed')return pause('A KAIROGEN recusou a cena. O restante ficou pausado.');
  }catch{
   await db`UPDATE fv_generation_jobs SET status='uncertain',updated_at=now() WHERE id=${j.id} AND status='sending'`;
   return pause('Envio sem confirmação. Não houve tentativa automática adicional. Confira o histórico na KAIROGEN.');
  }
  return true;
 }finally{await db`UPDATE fv_production_batches SET lease_id=NULL,lease_until=NULL WHERE id=${b.id} AND lease_id=${lease}`;}
}
