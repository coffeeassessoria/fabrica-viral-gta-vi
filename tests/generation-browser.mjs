import {createRequire} from 'node:module';
import {randomUUID,randomBytes,scryptSync} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import AxeBuilder from '@axe-core/playwright';
const require=createRequire('C:/Users/Vinicius Arenales/Documents/Codex/ipr-track-music/package.json');
const {chromium}=require('@playwright/test');
process.env.WORKSPACE_ID='generation-browser-'+randomUUID();
process.env.SESSION_SECRET=randomBytes(48).toString('hex');process.env.TOKEN_ENCRYPTION_KEY=randomBytes(32).toString('base64');
const password=randomBytes(24).toString('hex'),salt=randomBytes(24).toString('hex');process.env.ADMIN_PASSWORD_HASH=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;
let sends=0;const errors=[];let browser;
const tools=[{name:'generate_video',inputSchema:{type:'object',properties:{model:{type:'string',enum:['Modelo simulado']},prompt:{type:'string'},duration:{type:'integer',enum:[5]},wait_for_completion:{type:'boolean'}},required:['model','prompt','duration','wait_for_completion']}},{name:'estimate_cost',inputSchema:{type:'object',properties:{model:{type:'string'},duration:{type:'integer'}},required:['model','duration']}},{name:'get_generation',inputSchema:{type:'object',properties:{generation_id:{type:'string'}},required:['generation_id']}}];
const deps={tools:async()=>tools,call:async(name)=>{if(name==='estimate_cost')return {structuredContent:{credits:7}};if(name==='generate_video'){sends++;return {structuredContent:{generation_id:'test-result',status:'processing'}};}return {structuredContent:{generation_id:'test-result',status:'completed',video_url:'https://example.com/test-only-video.mp4'}};}};
const vite=await createServer({configFile:false,root:process.cwd(),server:{host:'127.0.0.1',port:4188,strictPort:true,hmr:false,watch:{ignored:['**/tests/artifacts/**']}},plugins:[{name:'test-generation-only',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 if(req.url?.split('?')[0]!=='/api/actions')return next();
 const {readBody,send,default:handler}=await server.ssrLoadModule('/server/actions.ts');
 try{req.body=await readBody(req);if(req.body.action==='generation.operation'){
  const {requireSession}=await server.ssrLoadModule('/server/security.ts');requireSession(req);
  const {generationOperation}=await server.ssrLoadModule('/server/generation.ts');
  return send(res,200,{data:await generationOperation(req.body.args,'http://127.0.0.1:4188',deps)});
 }return handler(req,res);}catch(e){send(res,e.status||500,{error:e.message});}
 });}}]});
await mkdir('tests/artifacts',{recursive:true});
const {sql,saveWorkspace}=await vite.ssrLoadModule('/server/database.ts');const db=sql();
try{
 const {generationSchema}=await vite.ssrLoadModule('/server/generation.ts');for(const s of generationSchema)await db.query(s,[]);
 await saveWorkspace({checklist:Array(5).fill(false),rodarChecklist:Array(6).fill(false),calendar:[{dia:'SEG',data:'',hora:'18h',status:'Pendente',titulo:''}],metrics:[],regra:'',production:[{id:'TEST-PILOT',title:'Piloto simulado para teste',day:'SEG',hook:'A chave mudou de dono.',script:'Cena fictícia de teste: uma recepcionista encontra uma chave e chama a hóspede.',caption:'Ficção de teste',hashtags:'#Teste',videoUrl:'',status:'Rascunho'}]},0);
 await vite.listen();browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});let page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4188');await page.getByLabel('Código de acesso',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar no estúdio',exact:true}).click();
 await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Mesa de produção',exact:true}).click();
 await page.getByRole('heading',{name:'Vídeos direto na Fábrica',exact:true}).waitFor();await page.getByLabel('Roteiro para produção').selectOption('TEST-PILOT');
 assert.equal(await page.getByRole('button',{name:'Preparar cena',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Aprovar esta versão do roteiro',exact:true}).click();await page.getByText('Versão atual aprovada para preparar cenas.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Preparar cena',exact:true}).click();
 await page.getByLabel('Modelo de vídeo *',{exact:true}).selectOption('Modelo simulado');await page.getByLabel('Duração *',{exact:true}).selectOption('5');await page.getByLabel('Descrição da cena *',{exact:true}).fill('Recepcionista encontra uma chave sobre o balcão.');
 await page.getByRole('button',{name:'Consultar custo desta cena',exact:true}).click();
 const generate=page.getByRole('button',{name:'Confirmar custo e gerar cena',exact:true});await generate.waitFor();assert.equal(await generate.isDisabled(),true);assert.equal(sends,0);
 await page.getByRole('checkbox',{name:'Aprovo esta cena e o custo de 7 créditos. Autorizo um envio à KAIROGEN.',exact:true}).check();assert.equal(sends,0);
 const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations;
 await writeFile('tests/artifacts/generation-axe.json',JSON.stringify(violations,null,2));assert.deepEqual(violations,[]);
 await page.screenshot({path:'tests/artifacts/generation-review-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('aside.studio-sidebar').waitFor({state:'hidden'});await page.getByRole('heading',{name:'Revisão de custo',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'tests/artifacts/generation-review-mobile.png',fullPage:false});
 await generate.click();await page.getByText('Gerando na KAIROGEN',{exact:false}).waitFor();assert.equal(sends,1);
 await page.getByRole('button',{name:'Consultar resultado na KAIROGEN',exact:true}).click();await page.getByRole('button',{name:'Usar como vídeo recebido',exact:true}).waitFor();
 await page.setViewportSize({width:1440,height:1000});await page.reload();await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Mesa de produção',exact:true}).click();await page.getByLabel('Roteiro para produção').selectOption('TEST-PILOT');await page.getByRole('button',{name:'Usar como vídeo recebido',exact:true}).waitFor();assert.equal(sends,1);
 await page.getByRole('button',{name:'Usar como vídeo recebido',exact:true}).click();await page.getByText('Salvo no banco',{exact:true}).waitFor();
 await page.getByLabel('Roteiro para o Claude e KAIROGEN',{exact:true}).fill('Roteiro alterado após aprovação.');await page.getByText('Revise e aprove esta versão antes de consultar o custo.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Preparar cena',exact:true}).isDisabled(),true);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({approvedBeforeCost:true,costConsentBeforeSend:true,simulatedSends:sends,resultAfterReload:true,editingInvalidatesApproval:true,axeViolations:violations.length,mobileOverflow:false}));
}finally{
 if(browser)await browser.close();const id=process.env.WORKSPACE_ID;
 await db`DELETE FROM fv_generation_jobs WHERE workspace_id=${id}`;await db`DELETE FROM fv_script_approvals WHERE workspace_id=${id}`;await db`DELETE FROM fv_workspace_history WHERE workspace_id=${id}`;await db`DELETE FROM fv_workspace WHERE id=${id}`;await vite.close();
}
