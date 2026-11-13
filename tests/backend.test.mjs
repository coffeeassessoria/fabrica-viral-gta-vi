import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,scryptSync} from 'node:crypto';
import {createServer as httpServer} from 'node:http';
import {createServer} from 'vite';

test('Banco real, salvamento integral, conflito, sessão e criptografia',{timeout:90000},async()=>{
  process.env.WORKSPACE_ID=`test-${randomUUID()}`;
  process.env.SESSION_SECRET=randomBytes(48).toString('hex');
  process.env.TOKEN_ENCRYPTION_KEY=randomBytes(32).toString('base64');
  const password=randomBytes(24).toString('hex'),salt=randomBytes(24).toString('hex');
  process.env.ADMIN_PASSWORD_HASH=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;
  const vite=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
  const {default:handler}=await vite.ssrLoadModule('/server/actions.ts');
  const {sql}=await vite.ssrLoadModule('/server/database.ts');
  const {encrypt,decrypt}=await vite.ssrLoadModule('/server/security.ts');
  const server=httpServer((req,res)=>void handler(req,res));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  let cookie='';
  const request=async(action,args={},extra={})=>{const r=await fetch(origin+'/api/actions',{method:'POST',headers:{'content-type':'application/json',cookie,...extra},body:JSON.stringify({action,args})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};};
  const initial={checklist:[false,false,false,false,false],rodarChecklist:Array(6).fill(false),calendar:[{dia:'SEG',data:'16/11',hora:'18h',status:'Pendente',titulo:'Teste isolado: café & ação'}],metrics:[{video:'Teste',views:'',retencao:'',comentarios:'',seguidores:''}],regra:'Comparar períodos equivalentes.'};
  try{
    assert.equal((await request('workspace.load')).status,401);
    assert.equal((await request('auth.session')).data.data.authenticated,false);
    assert.equal((await request('auth.login',{password:'incorreta'})).status,401);
    const access=await request('auth.login',{password});assert.equal(access.status,200);assert.match(access.cookie,/HttpOnly/);assert.match(access.cookie,/SameSite=Lax/);cookie=access.cookie.split(';')[0];
    assert.equal((await request('workspace.load')).data.data.state,null);
    const first=await request('workspace.save',{revision:0,state:initial});assert.equal(first.status,200);assert.equal(first.data.data.revision,1);
    const changed=structuredClone(initial);changed.checklist[0]=true;changed.calendar[0].titulo='Título persistido';changed.metrics[0].views='1234';changed.regra='Aprendizado salvo';changed.rodarChecklist[2]=true;
    assert.equal((await request('workspace.save',{revision:0,state:changed})).status,409);
    const second=await request('workspace.save',{revision:1,state:changed});assert.equal(second.status,200);assert.equal(second.data.data.revision,2);
    assert.equal((await request('workspace.save',{revision:1,state:changed})).data.data.revision,2);
    const loaded=await request('workspace.load');assert.deepEqual(loaded.data.data.state,changed);
    assert.equal((await request('workspace.save',{revision:2,state:{...changed,checklist:[]}})).status,400);
    assert.deepEqual((await request('workspace.load')).data.data.state,changed);
    assert.equal((await request('workspace.save',{revision:2,state:initial},{origin:'https://outro-site.example'})).status,403);
    assert.equal((await request('records.list',{collection:'fabrica_checklist'})).data.data.records[0].value.items[0],true);
    assert.equal((await request('integrations.connect',{provider:'nao-permitido'})).status,400);
    const history=await sql()`SELECT state FROM fv_workspace_history WHERE workspace_id=${process.env.WORKSPACE_ID}`;assert.equal(history.length,1);assert.deepEqual(history[0].state,initial);
    const cipher=encrypt({token:'token-de-teste'});assert.ok(!cipher.includes('token-de-teste'));assert.deepEqual(decrypt(cipher),{token:'token-de-teste'});
    const tampered=Buffer.from(cipher,'base64');tampered[15]^=1;assert.throws(()=>decrypt(tampered.toString('base64')));
    assert.equal((await request('authoring.generate',{theme:'Teste',confirmed:false})).status,400);
    const malformed=await fetch(origin+'/api/actions',{method:'POST',headers:{'content-type':'application/json',cookie},body:'{'});assert.equal(malformed.status,400);
    assert.equal((await request('auth.logout')).status,200);
  }finally{
    await sql()`DELETE FROM fv_workspace_history WHERE workspace_id=${process.env.WORKSPACE_ID}`;
    await sql()`DELETE FROM fv_workspace WHERE id=${process.env.WORKSPACE_ID}`;
    await new Promise(resolve=>server.close(resolve));await vite.close();
  }
});
