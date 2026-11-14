import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';

test('Catálogo real: parâmetros por modelo, plano exigido e custo protegido',async()=>{
 const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom'});
 try{
  const {sceneModels,sceneParameters}=await vite.ssrLoadModule('/server/kairogen-catalog.ts');
  const {contract,quoteArgs,credits}=await vite.ssrLoadModule('/server/kairogen-contract.ts');
  const fixture=JSON.parse(await readFile('tests/fixtures/kairogen-contract.json','utf8'));
  const spec=contract(fixture.tools),models=sceneModels(fixture.catalog,spec.generate);
  assert.ok(!models.some(m=>m.key==='kling-video-o1-edit-image-to-video'));
  const model=models.find(m=>m.key==='wan-2-7');assert.ok(model);
  const defaults=Object.fromEntries(model.fields.filter(f=>f.default!==undefined).map(f=>[f.name,f.default]));
  const input={model:model.key,prompt:'Cena fictícia para teste',...defaults};
  const args=sceneParameters(spec.generate,models,input);
  assert.equal(args.quantity,1);assert.equal(args.wait_for_completion,false);
  assert.equal(args.extra_params._mode,'base');
  assert.throws(()=>sceneParameters(spec.generate,models,{...input,duration_seconds:999}));
  assert.throws(()=>sceneParameters(spec.generate,models,{...input,expected_credits:0}));
  assert.throws(()=>sceneParameters(spec.generate,models,{...input,'extra_params.image':'https://example.com/unapproved.png'}));
  assert.throws(()=>quoteArgs(spec.quote,args));
  const quote=quoteArgs(spec.quote,args,{plan_key:'pro'});
  assert.equal(quote.plan_key,'pro');assert.equal(quote.quantity,1);assert.deepEqual(quote.extra_params,args.extra_params);
  assert.ok(!('prompt' in quote));assert.ok(!('wait_for_completion' in quote));
  assert.throws(()=>quoteArgs(spec.quote,args,{plan_key:'inventado'}));
  assert.equal(credits({structuredContent:{credit_cost:7}}),7);
  assert.throws(()=>credits({structuredContent:{credit_cost:'7'}}));
  const incomplete={...spec.quote,inputSchema:{...spec.quote.inputSchema,properties:{model:{type:'string'}}}};
  assert.throws(()=>quoteArgs(incomplete,args,{plan_key:'pro'}),/não cobre/);
 }finally{await vite.close();}
});
