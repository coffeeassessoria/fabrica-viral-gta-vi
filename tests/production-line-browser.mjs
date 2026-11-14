import {createRequire} from 'node:module';
import {randomUUID,randomBytes,scryptSync} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import AxeBuilder from '@axe-core/playwright';
const require=createRequire('C:/Users/Vinicius Arenales/Documents/Codex/ipr-track-music/package.json');
const {chromium}=require('@playwright/test');
process.env.WORKSPACE_ID='generation-browser-'+randomUUID();
process.env.SESSION_SECRET=randomBytes(48).toString('hex');process.env.TOKEN_ENCRYPTION_KEY=randomBytes(32).toString('base64');
const password=randomBytes(24).toString('hex'),salt=randomBytes(24).toString('hex');process.env.ADMIN_PASSWORD_HASH=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;
let sends=0;const errors=[];let browser;let queuedId;
const pilot=JSON.parse(await readFile('docs/pesquisa-2026-11-13/CONTEUDO-IMPORTADO-FV08-FV31.json','utf8')).find(p=>p.id==='FV08');
const fixture=JSON.parse(await readFile('tests/fixtures/kairogen-contract.json','utf8'));
const tools=fixture.tools;
const deps={tools:async()=>tools,call:async(name,args)=>{
 if(name==='list_models')return {structuredContent:fixture.catalog};
 if(name==='get_credits')return {structuredContent:{credits_remaining:100}};
 if(name==='estimate_cost'){assert.equal(args.plan_key,'pro');return {structuredContent:{credit_cost:7}};}
 if(name==='generate_video'){sends++;assert.equal(args.expected_credits,7);assert.equal(args.quantity,1);return {structuredContent:{generation_id:'test-result',status:'processing'}};}
 return {structuredContent:{generation_id:'test-result',status:'completed',video_url:'https://example.com/test-only-video.mp4'}};
}};
const vite=await createServer({configFile:false,root:process.cwd(),server:{host:'127.0.0.1',port:4188,strictPort:true,hmr:false,watch:{ignored:['**/tests/artifacts/**']}},plugins:[{name:'test-generation-only',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 if(req.url?.split('?')[0]!=='/api/actions')return next();
 const {readBody,send,default:handler}=await server.ssrLoadModule('/server/actions.ts');
 try{req.body=await readBody(req);
 if(req.body.action==='production.operation'){
  const {requireSession}=await server.ssrLoadModule('/server/security.ts');requireSession(req);
  const {lineOperation}=await server.ssrLoadModule('/server/production-line.ts');
  return send(res,200,{data:await lineOperation(req.body.args,'http://127.0.0.1:4188',async(id)=>{queuedId=id;},deps)});
 }
 if(req.body.action==='generation.operation'){
  const {requireSession}=await server.ssrLoadModule('/server/security.ts');requireSession(req);
  const {generationOperation}=await server.ssrLoadModule('/server/generation.ts');
  return send(res,200,{data:await generationOperation(req.body.args,'http://127.0.0.1:4188',deps)});
 }return handler(req,res);}catch(e){send(res,e.status||500,{error:e.message});}
 });}}]});
await mkdir('tests/artifacts',{recursive:true});
const {sql,saveWorkspace}=await vite.ssrLoadModule('/server/database.ts');const db=sql();
try{
 const {lineSchema}=await vite.ssrLoadModule('/server/production-line.ts');for(const statement of lineSchema)await db.query(statement,[]);const {generationSchema}=await vite.ssrLoadModule('/server/generation.ts');for(const s of generationSchema)await db.query(s,[]);
 await saveWorkspace({checklist:Array(5).fill(false),rodarChecklist:Array(6).fill(false),calendar:[{dia:'SEG',data:'',hora:'18h',status:'Pendente',titulo:''}],metrics:[],regra:'',production:[{id:'TEST-PILOT',title:'Piloto simulado para teste',day:'SEG',hook:'A chave mudou de dono.',script:pilot.script,caption:'Ficção de teste',hashtags:'#Teste',videoUrl:'',status:'Rascunho'}]},0);
 await vite.listen();browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});let page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4188');await page.getByLabel('Código de acesso',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar no estúdio',exact:true}).click();
 await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Mesa de produção',exact:true}).click();
 await page.getByRole('heading',{name:'Do roteiro às cenas, em uma aprovação',exact:true}).waitFor();
 await page.getByRole('button',{name:'Calcular orçamento do episódio',exact:true}).click();
 await page.getByText('49 créditos no total',{exact:true}).waitFor();
 const start=page.getByRole('button',{name:'Aprovar e iniciar produção',exact:true});assert.equal(await start.isDisabled(),true);assert.equal(sends,0);
 const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations;
 await writeFile('tests/artifacts/production-line-axe.json',JSON.stringify(violations,null,2));assert.deepEqual(violations,[]);
 for(const width of [320,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.getByRole('heading',{name:'2. Uma aprovação para todas as cenas',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:'tests/artifacts/production-line-mobile.png',fullPage:false});
 await page.getByRole('checkbox',{name:/Aprovo este roteiro e autorizo gerar/}).check();await start.click();
 await page.getByRole('heading',{name:'Na fila',exact:true}).waitFor();assert.ok(queuedId);assert.equal(sends,0);
 await page.close(); // Worker proceeds without an open page; provider responses remain simulated.
 const {productionTick}=await vite.ssrLoadModule('/server/production-line.ts');
 for(let i=0;i<16;i++)await productionTick(queuedId,'http://127.0.0.1:4188',deps);
 assert.equal(sends,7);
 page=await context.newPage();await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:4188');
 await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Mesa de produção',exact:true}).click();
 await page.getByRole('heading',{name:'Cenas prontas para revisar',exact:true}).waitFor();assert.equal(await page.locator('video').count(),7);
 assert.equal(await page.getByRole('checkbox',{name:/Aprovo este roteiro/}).count(),0);assert.equal(sends,7);
 await page.getByRole('button',{name:'Concluir revisão das cenas',exact:true}).click();await page.getByRole('heading',{name:'Cenas revisadas',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({oneBudgetApproval:true,allSevenScenes:true,workerWithoutOpenPage:true,simulatedSends:sends,axeViolations:0,mobileOverflow:false,finalReviewPersisted:true}));

}finally{
 if(browser)await browser.close();const id=process.env.WORKSPACE_ID;
 await db`DELETE FROM fv_production_batches WHERE workspace_id=${id}`;await db`DELETE FROM fv_generation_jobs WHERE workspace_id=${id}`;await db`DELETE FROM fv_script_approvals WHERE workspace_id=${id}`;await db`DELETE FROM fv_workspace_history WHERE workspace_id=${id}`;await db`DELETE FROM fv_workspace WHERE id=${id}`;await vite.close();
}
