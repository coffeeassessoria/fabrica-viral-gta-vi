import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';

test('Linha: aprovação única, limite, entregas duplicadas, retomada e falhas sem reenvio',{timeout:120000},async()=>{
 process.env.SESSION_SECRET=randomUUID();process.env.WORKSPACE_ID='line-test-'+randomUUID();const wid=process.env.WORKSPACE_ID;
 const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom'});
 const {signedProductionMessage,verifyProductionMessage}=await vite.ssrLoadModule('/server/production-queue.ts');const message=signedProductionMessage(randomUUID());assert.equal(verifyProductionMessage(message),true);assert.equal(verifyProductionMessage({...message,batchId:randomUUID()}),false);assert.equal(verifyProductionMessage({...message,signature:''}),false);
 const {lineOperation:op,productionTick:tick,lineSchema}=await vite.ssrLoadModule('/server/production-line.ts');
 const {generationSchema,generationOperation}=await vite.ssrLoadModule('/server/generation.ts');
 const {sql,saveWorkspace,loadWorkspace}=await vite.ssrLoadModule('/server/database.ts');const db=sql();
 const {editorial}=await vite.ssrLoadModule('/server/kairogen-contract.ts');
 const fixture=JSON.parse(await readFile('tests/fixtures/kairogen-contract.json','utf8'));
 for(const statement of [...generationSchema,...lineSchema])await db.query(statement,[]);
 let sends=0,price=7,fail=false,dispatches=0;const ids=new Map();
 const deps={tools:async()=>fixture.tools,call:async(name,args)=>{
  if(name==='list_models')return {structuredContent:fixture.catalog};
  if(name==='estimate_cost'){assert.equal(args.plan_key,'pro');return {structuredContent:{credit_cost:price}};}
  if(name==='generate_video'){sends++;assert.equal(args.expected_credits,price);assert.equal(args.quantity,1);assert.equal(args.aspect_ratio,'9:16');if(fail)throw new Error('timeout');const id=randomUUID();ids.set(id,true);return {structuredContent:{generation_id:id,status:'processing'}};}
  if(name==='get_generation'){assert.ok(ids.has(args.generation_id));return {structuredContent:{generation_id:args.generation_id,status:'completed',video_url:'https://example.com/fake.mp4'}};}
  throw new Error('Unexpected operation');
 }};
 const script='| Tempo | Imagem e ação | Fala, som e texto |\n|---|---|---|\n| 0–2s | Porta abre | Olá |\n| 2–7s | Ela entra | Cheguei |';
 const base={id:'A',title:'Teste',day:'SEG',hook:'Gancho',script,caption:'Ficção',hashtags:'#Teste',status:'Rascunho',videoUrl:''};
 const state={checklist:Array(5).fill(false),rodarChecklist:Array(6).fill(false),calendar:[{dia:'SEG',data:'',hora:'18h',status:'Pendente',titulo:''}],metrics:[],regra:'',production:['A','B','C','D'].map(id=>({...base,id}))};
 const call=(operation,extra={})=>op({operation,...extra},'https://example.com',async()=>{dispatches++;},deps);
 const quote=async(id)=>call('quote',{itemId:id,scriptSnapshot:JSON.stringify(editorial(state.production.find(i=>i.id===id)))});
 try{
  await saveWorkspace(state,0);
  await assert.rejects(call('quote',{itemId:'A',scriptSnapshot:'stale'}),/Salve/);
  const q=await quote('A');assert.equal(q.total,14);assert.deepEqual(q.scenes.map(s=>s.duration),[4,6]);assert.equal(sends,0);
  assert.equal(await tick(q.id,'https://example.com',deps),false);assert.equal(sends,0);
  await assert.rejects(call('start',{batchId:q.id,confirmed:false}),/Aprove/);
  await Promise.all([call('start',{batchId:q.id,confirmed:true}),call('start',{batchId:q.id,confirmed:true})]);
  await Promise.all([tick(q.id,'https://example.com',deps),tick(q.id,'https://example.com',deps)]);assert.equal(sends,1);
  await assert.rejects(generationOperation({operation:'generate',jobId:q.scenes[0].jobId,confirmed:true},'https://example.com',deps),/linha/);
  await call('pause',{batchId:q.id});await tick(q.id,'https://example.com',deps);assert.equal(sends,1);
  await call('resume',{batchId:q.id});
  for(let i=0;i<6;i++)await tick(q.id,'https://example.com',deps);
  assert.equal(sends,2);assert.equal((await call('list')).batches.find(b=>b.id===q.id).status,'review');
  await assert.rejects(call('finish',{batchId:q.id}),/Assista/);await call('finish',{batchId:q.id,confirmed:true});
  const q2=await quote('B');await call('start',{batchId:q2.id,confirmed:true});price=8;
  await tick(q2.id,'https://example.com',deps);assert.equal(sends,2);assert.equal((await call('list')).batches.find(b=>b.id===q2.id).status,'paused');price=7;
  const q3=await quote('C');await call('start',{batchId:q3.id,confirmed:true});fail=true;
  await tick(q3.id,'https://example.com',deps);assert.equal(sends,3);
  await call('resume',{batchId:q3.id});await tick(q3.id,'https://example.com',deps);assert.equal(sends,3);
  assert.equal((await call('list')).jobs.find(j=>j.batchId===q3.id).status,'uncertain');fail=false;
  const q4=await quote('D');await call('start',{batchId:q4.id,confirmed:true});
  const ws=await loadWorkspace();await saveWorkspace({...ws.state,production:ws.state.production.map(p=>p.id==='D'?{...p,script:p.script+'\nAlteração'}:p)},ws.revision);
  await tick(q4.id,'https://example.com',deps);assert.equal(sends,3);await assert.rejects(call('resume',{batchId:q4.id}),/roteiro mudou/);
  process.env.WORKSPACE_ID='different-test';await assert.rejects(call('pause',{batchId:q.id}),/não encontrada/);process.env.WORKSPACE_ID=wid;
  assert.deepEqual((await loadWorkspace()).state.calendar,state.calendar);assert.ok(dispatches>=4);
 }finally{
  process.env.WORKSPACE_ID=wid;
  await db`DELETE FROM fv_generation_jobs WHERE workspace_id=${wid}`;await db`DELETE FROM fv_production_batches WHERE workspace_id=${wid}`;
  await db`DELETE FROM fv_script_approvals WHERE workspace_id=${wid}`;await db`DELETE FROM fv_workspace_history WHERE workspace_id=${wid}`;await db`DELETE FROM fv_workspace WHERE id=${wid}`;await vite.close();
 }
});
