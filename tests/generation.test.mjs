import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'vite';

test('Aprovação, orçamento, concorrência e recuperação da geração sem custo externo',{timeout:90000},async()=>{
 process.env.WORKSPACE_ID='generation-test-'+randomUUID();const wid=process.env.WORKSPACE_ID;
 const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom'});
 const {generationOperation:op,generationSchema}=await vite.ssrLoadModule('/server/generation.ts');
 const {sql,saveWorkspace,loadWorkspace}=await vite.ssrLoadModule('/server/database.ts');
 const {generationResult,credits,contract}=await vite.ssrLoadModule('/server/kairogen-contract.ts');
 const db=sql();for(const statement of generationSchema)await db.query(statement,[]);
 // Synthetic fixture, not a claim about the authenticated KAIROGEN contract.
 const props={model:{type:'string',enum:['test-video']},prompt:{type:'string'},duration:{type:'integer',enum:[5]},wait_for_completion:{type:'boolean'},expected_credits:{type:'integer',minimum:0}};
 const tools=[{name:'generate_video',inputSchema:{type:'object',properties:props,required:Object.keys(props).filter(k=>k!=='expected_credits')}},{name:'estimate_cost',inputSchema:{type:'object',properties:{model:props.model,duration:props.duration},required:['model','duration']}},{name:'get_generation',inputSchema:{type:'object',properties:{generation_id:{type:'string'}},required:['generation_id']}}];
 let price=7,sends=0,fail=false;
 const deps={tools:async()=>tools,call:async(name,args)=>{
  if(name==='estimate_cost')return {structuredContent:{credits:price}};
  if(name==='generate_video'){sends++;assert.equal(args.wait_for_completion,false);assert.equal(args.expected_credits,price);if(fail)throw new Error('uncertain timeout');return {structuredContent:{generation_id:'fixture-generation',status:'processing'}};}
  if(name==='get_generation')return {structuredContent:{generation_id:args.generation_id,status:'completed',video_url:'https://example.com/fixture.mp4'}};
  throw new Error('Unexpected call');
 }};
 const call=(operation,extra={})=>op({operation,itemId:'TEST',...extra},'https://example.com',deps);
 const item={id:'TEST',title:'Ficção de teste',day:'SEG',hook:'Gancho',script:'Uma cena original',caption:'Legenda',hashtags:'#Teste',status:'Rascunho',videoUrl:''};
 const initial={checklist:Array(5).fill(false),rodarChecklist:Array(6).fill(false),calendar:[{dia:'SEG',data:'',hora:'18h',status:'Pendente',titulo:''}],metrics:[],regra:'',production:[item]};
 const parameters={model:'test-video',duration:5,prompt:'Uma cena do roteiro'};
 try{
  await saveWorkspace(initial,0);
  await assert.rejects(call('quote',{parameters}),/Aprove/);
  await assert.rejects(call('approve',{confirmed:false}),/Confirme/);
  await assert.rejects(call('approve',{confirmed:true,item:{...item,script:'Não salvo'}}),/Salve/);
  await call('approve',{confirmed:true,item});
  assert.ok((await call('list')).approvedSnapshots.TEST);
  await assert.rejects(call('quote',{parameters:{...parameters,unknown:'injected'}}),/Parâmetro/);
  const quote=await call('quote',{parameters});assert.equal(quote.cost,7);assert.equal(sends,0);
  await assert.rejects(call('generate',{jobId:quote.id,confirmed:false}),/Confirme/);
  price=8;await assert.rejects(call('generate',{jobId:quote.id,confirmed:true}),/custo mudou/);assert.equal(sends,0);
  const q2=await call('quote',{parameters});
  const concurrent=await Promise.allSettled([call('generate',{jobId:q2.id,confirmed:true}),call('generate',{jobId:q2.id,confirmed:true})]);
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,2);assert.equal(sends,1);
  await assert.rejects(call('quote',{parameters}),/andamento/);
  const done=await call('refresh',{jobId:q2.id});assert.equal(done.status,'completed');assert.deepEqual(done.urls,['https://example.com/fixture.mp4']);
  await call('generate',{jobId:q2.id,confirmed:true});assert.equal(sends,1);
  const q3=await call('quote',{parameters});
  let saved=await loadWorkspace();await saveWorkspace({...saved.state,production:[{...item,script:'Nova versão'}]},saved.revision);
  assert.equal((await call('list')).approvedIds.length,0);
  await assert.rejects(call('generate',{jobId:q3.id,confirmed:true}),/Aprove/);
  await call('approve',{confirmed:true});
  await assert.rejects(call('generate',{jobId:q3.id,confirmed:true}),/roteiro mudou/);
  const q4=await call('quote',{parameters});await call('revoke');await assert.rejects(call('quote',{parameters}),/Aprove/);
  assert.equal((await call('generate',{jobId:q4.id,confirmed:true})).status,'expired');
  await call('approve',{confirmed:true});const q5=await call('quote',{parameters});fail=true;
  await assert.rejects(call('generate',{jobId:q5.id,confirmed:true}),/sem confirmação/);assert.equal(sends,2);
  assert.equal((await call('generate',{jobId:q5.id,confirmed:true})).status,'uncertain');assert.equal(sends,2);
  await assert.rejects(call('quote',{parameters}),/andamento/);
  process.env.WORKSPACE_ID='other-test';await assert.rejects(call('refresh',{jobId:q2.id}),/não encontrada/);process.env.WORKSPACE_ID=wid;
  assert.throws(()=>credits({structuredContent:{price:8}}),/custo numérico/);
  assert.throws(()=>credits({structuredContent:{credits:-1}}),/custo numérico/);
  assert.throws(()=>contract([]),/conexão/);
  const realShape=generationResult({structuredContent:{generation_id:'known',status:'completed',output_urls:['https://example.com/delivered.mp4','javascript:alert(1)']}});assert.equal(realShape.status,'completed');assert.deepEqual(realShape.urls,['https://example.com/delivered.mp4']);
  assert.equal(generationResult({structuredContent:{status:'completed',url:'javascript:alert(1)'}}).status,'processing');
  assert.deepEqual((await loadWorkspace()).state.calendar,initial.calendar);
 }finally{
  process.env.WORKSPACE_ID=wid;
  await db`DELETE FROM fv_generation_jobs WHERE workspace_id=${wid}`;
  await db`DELETE FROM fv_script_approvals WHERE workspace_id=${wid}`;
  await db`DELETE FROM fv_workspace_history WHERE workspace_id=${wid}`;
  await db`DELETE FROM fv_workspace WHERE id=${wid}`;
  await vite.close();
 }
});
