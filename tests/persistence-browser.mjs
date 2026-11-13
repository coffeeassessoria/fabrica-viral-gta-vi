import {createRequire} from 'node:module';
import {randomBytes,randomUUID,scryptSync} from 'node:crypto';
import {createServer} from 'vite';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Vinicius Arenales/Documents/Codex/ipr-track-music/package.json');
const {chromium}=require('@playwright/test');
const root=process.cwd();
await mkdir('tests/artifacts',{recursive:true});
const profile=await mkdtemp(path.join(root,'tests/artifacts/profile-'));
process.env.WORKSPACE_ID=`browser-${randomUUID()}`;
process.env.SESSION_SECRET=randomBytes(48).toString('hex');
process.env.TOKEN_ENCRYPTION_KEY=randomBytes(32).toString('base64');
const password=randomBytes(24).toString('hex'),salt=randomBytes(24).toString('hex');
process.env.ADMIN_PASSWORD_HASH=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;
let vite,context;
const errors=[],checks=[];
async function start(){
  vite=await createServer({configFile:false,root,server:{host:'127.0.0.1',port:4176,strictPort:true,watch:{ignored:['**/tests/artifacts/**']}},plugins:[{name:'real-test-api',configureServer(server){server.middlewares.use(async(req,res,next)=>{if(req.url?.split('?')[0]==='/api/actions'){const {default:handler}=await server.ssrLoadModule('/server/actions.ts');return handler(req,res);}next();});}}]});
  await vite.listen();
}
async function open(){context=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:true,viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4176');return page;}
async function navigate(page,label){await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:label,exact:true}).click();}
async function saved(page){await page.getByText('Salvo no banco',{exact:true}).waitFor();}
try{
  await start();let page=await open();
  await page.getByLabel('Código de acesso',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar no estúdio',exact:true}).click();
  await page.getByRole('button',{name:'Escolher as ideias'}).click();await saved(page);
  await navigate(page,'Calendário');await page.getByRole('textbox',{name:'Título do vídeo de SEG',exact:true}).fill('Persistência real após fechar o navegador');await page.getByRole('combobox',{name:'Status de SEG',exact:true}).selectOption('Pronto');await saved(page);
  await navigate(page,'Métricas');await page.getByRole('textbox',{name:'Visualizações, linha 1',exact:true}).fill('4321');await page.getByRole('textbox',{name:'Comentários, linha 1',exact:true}).fill('23');await page.getByRole('textbox',{name:'Aprendizado para a próxima semana',exact:true}).fill('Este aprendizado precisa sobreviver ao fechamento.');await saved(page);
  await navigate(page,'Começar produção');await page.getByRole('button',{name:'Marcar Passo 1 como feito'}).click();await saved(page);
  await context.close();context=null;await vite.close();await start();page=await open();
  await saved(page);await page.getByRole('button',{name:'Escolher as ideias'}).waitFor();assert.equal(await page.getByRole('button',{name:'Escolher as ideias'}).getAttribute('aria-pressed'),'true');
  await navigate(page,'Calendário');assert.equal(await page.getByRole('textbox',{name:'Título do vídeo de SEG',exact:true}).inputValue(),'Persistência real após fechar o navegador');assert.equal(await page.getByRole('combobox',{name:'Status de SEG',exact:true}).inputValue(),'Pronto');
  await navigate(page,'Métricas');assert.equal(await page.getByRole('textbox',{name:'Visualizações, linha 1',exact:true}).inputValue(),'4321');assert.equal(await page.getByRole('textbox',{name:'Comentários, linha 1',exact:true}).inputValue(),'23');assert.equal(await page.getByRole('textbox',{name:'Aprendizado para a próxima semana',exact:true}).inputValue(),'Este aprendizado precisa sobreviver ao fechamento.');
  await navigate(page,'Começar produção');assert.equal(await page.getByRole('button',{name:'Marcar Passo 1 como feito'}).getAttribute('aria-pressed'),'true');
  checks.push('Checklist, calendário, métricas, regra e checklist de setup restaurados após fechar todo o navegador e reiniciar o servidor real.');
  await navigate(page,'Calendário');await page.route('**/api/actions',route=>{if(route.request().postDataJSON().action==='workspace.save')return route.abort('failed');return route.continue();});
  await page.getByRole('textbox',{name:'Título do vídeo de TER',exact:true}).fill('Rascunho recuperado antes do envio');
  await context.close();context=null;page=await open();await navigate(page,'Calendário');assert.equal(await page.getByRole('textbox',{name:'Título do vídeo de TER',exact:true}).inputValue(),'Rascunho recuperado antes do envio');await saved(page);
  checks.push('Rascunho local recuperado e enviado ao banco após fechamento antes do salvamento.');
  await navigate(page,'Integrações');assert.equal(await page.getByRole('button',{name:'Conectar conta',exact:true}).count(),2);
  await navigate(page,'Vídeos e postagem');assert.equal(await page.getByRole('button',{name:'Gerar vídeo',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Confirmar agendamento',exact:true}).isDisabled(),true);
  checks.push('Sem autorização dos provedores, geração e agendamento ficam desabilitados. Nenhuma chamada paga ou postagem executada.');
  assert.deepEqual(errors,[]);
}finally{
  if(context)await context.close();
  if(vite){const {sql}=await vite.ssrLoadModule('/server/database.ts');await sql()`DELETE FROM fv_workspace_history WHERE workspace_id=${process.env.WORKSPACE_ID}`;await sql()`DELETE FROM fv_workspace WHERE id=${process.env.WORKSPACE_ID}`;await vite.close();}
  await writeFile('tests/artifacts/persistence-browser.json',JSON.stringify({checks,errors},null,2));
}
console.log(JSON.stringify({checks,errors},null,2));
