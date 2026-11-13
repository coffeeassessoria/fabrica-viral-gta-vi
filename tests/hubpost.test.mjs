import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'vite';

test('Contrato de publicação e idempotência: nenhum post externo',{timeout:90000},async()=>{
  const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom'});
  const {buildPublicationArguments}=await vite.ssrLoadModule('/server/hubpost-contract.ts');
  const {validateProduction}=await vite.ssrLoadModule('/persistence/production.ts');
  const {dispatchPublication}=await vite.ssrLoadModule('/server/posting-jobs.ts');
  const {sql}=await vite.ssrLoadModule('/server/database.ts');
  // Fixtures describe supported shapes; they do not claim a real provider schema.
  const schema={type:'object',properties:{account_ids:{type:'array',items:{type:'string'}},caption:{type:'string'},media_urls:{type:'array',items:{type:'string'}},status:{type:'string',enum:['draft','scheduled','published']},scheduled_at:{type:'string'}},required:['account_ids','caption','media_urls','status']};
  const input={accountId:'fixture-account',caption:'Legenda de teste',mediaUrl:'https://example.com/test.mp4',mode:'publish'};
  const ids=[randomUUID(),randomUUID(),randomUUID()];
  try{
    assert.deepEqual(buildPublicationArguments(input,schema),{account_ids:['fixture-account'],caption:input.caption,media_urls:[input.mediaUrl],status:'published'});
    assert.equal(buildPublicationArguments({...input,mode:'draft'},schema).status,'draft');
    const scheduledAt=new Date(Date.now()+86400000).toISOString();
    assert.equal(buildPublicationArguments({...input,mode:'schedule',scheduledAt},schema).scheduled_at,scheduledAt);
    assert.throws(()=>buildPublicationArguments({...input,mode:'schedule',scheduledAt:'2020-01-01'},schema),/data futura/);
    assert.throws(()=>buildPublicationArguments({...input,mediaUrl:'http://example.com/video'},schema),/HTTPS/);
    assert.throws(()=>buildPublicationArguments({...input,mediaUrl:'https://user:pass@example.com/video'},schema),/credenciais/);
    const {media_urls,...withoutMedia}=schema.properties;
    assert.throws(()=>buildPublicationArguments(input,{...schema,properties:withoutMedia}),/upload de mídia/);
    const {account_ids,...withoutAccount}=schema.properties;
    assert.throws(()=>buildPublicationArguments(input,{type:'object',properties:withoutAccount}),/conta ou da legenda/);
    assert.throws(()=>buildPublicationArguments(input,{...schema,required:[...schema.required,'unknown_required']}),/informações adicionais/);
    assert.throws(()=>buildPublicationArguments({...input,mode:'draft'},{type:'object',properties:{account_ids,caption:{type:'string'},media_urls:schema.properties.media_urls,publish_now:{type:'boolean'}}}),/modalidade/);
    const item={id:'test',title:'',day:'SEG',hook:'',script:'',caption:'',hashtags:'',videoUrl:'htt',status:'Rascunho'};
    assert.equal(validateProduction([item])[0].videoUrl,'htt');
    assert.throws(()=>validateProduction([item,item]),/Identificação/);
    const actual=JSON.parse(await readFile(new URL('./fixtures/hubpost-create-post.json',import.meta.url),'utf8'));
    const options={title:'Vídeo de teste',tags:[],category:'film_and_animation',visibility:'private',license:'youtube',madeForKids:false,notifySubscribers:false,allowEmbedding:false,aiGenerated:true};
    const libraryInput={accountId:'test-account',caption:'Teste de contrato sem envio',mediaId:'test-media',platform:'YOUTUBE',platformOptions:options,mode:'draft'};
    assert.deepEqual(buildPublicationArguments(libraryInput,actual),{accountId:libraryInput.accountId,caption:libraryInput.caption,mediaIds:['test-media'],platformOptions:options});
    const immediate=buildPublicationArguments({...libraryInput,mode:'publish'},actual);assert.ok(Date.parse(immediate.scheduledAt)<Date.now());assert.equal(immediate.scheduledAt,buildPublicationArguments({...libraryInput,mode:'publish'},actual).scheduledAt);
    assert.equal(buildPublicationArguments({...libraryInput,mode:'schedule',scheduledAt},actual).scheduledAt,scheduledAt);
    assert.throws(()=>buildPublicationArguments({...libraryInput,mediaId:undefined,mediaUrl:'https://example.com/test.mp4'},actual),/biblioteca/);
    assert.throws(()=>buildPublicationArguments({...libraryInput,platformOptions:{...options,madeForKids:undefined}},actual),/opções/);
    const tiktok={privacyLevel:'SELF_ONLY',allowComment:false,allowDuet:false,allowStitch:false,aiGenerated:true};
    assert.deepEqual(buildPublicationArguments({...libraryInput,platform:'TIKTOK',platformOptions:tiktok},actual).platformOptions,tiktok);
    assert.throws(()=>buildPublicationArguments({...libraryInput,platform:'TIKTOK',platformOptions:{...tiktok,privacyLevel:''}},actual),/privacidade/);
    let calls=0;
    const response={content:[{type:'text',text:'Resposta simulada; nenhum post enviado.'}]};
    const send=async()=>{calls++;return response;};
    const first=await dispatchPublication(ids[0],{b:2,a:1},send);
    assert.deepEqual((await dispatchPublication(ids[0],{a:1,b:2},send)),first);
    assert.equal(calls,1);
    await assert.rejects(dispatchPublication(ids[0],{a:3,b:2},send),/revisão mudou/);
    let started,release;
    const ready=new Promise(resolve=>started=resolve),gate=new Promise(resolve=>release=resolve);
    const sending=dispatchPublication(ids[1],{test:'pending'},async()=>{calls++;started();await gate;return response;});
    await ready;
    await assert.rejects(dispatchPublication(ids[1],{test:'pending'},send),/já foi iniciado/);
    release();await sending;
    await assert.rejects(dispatchPublication(ids[2],{test:'uncertain'},async()=>{calls++;throw new Error('simulated timeout');}),/não confirmou/);
    const beforeRetry=calls;
    await assert.rejects(dispatchPublication(ids[2],{test:'uncertain'},send),/já foi iniciado/);
    assert.equal(calls,beforeRetry);
  }finally{
    for(const id of ids)await sql()`DELETE FROM fv_jobs WHERE id=${id} AND provider='hubpost' AND kind='create_post'`;
    await vite.close();
  }
});
