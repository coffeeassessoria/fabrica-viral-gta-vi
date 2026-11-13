import {randomBytes} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {auth,type OAuthClientProvider} from '@modelcontextprotocol/sdk/client/auth.js';
import type {OAuthClientInformationMixed,OAuthTokens,OAuthClientMetadata} from '@modelcontextprotocol/sdk/shared/auth.js';
import {sql,HttpError} from './database.js';
import {encrypt,decrypt} from './security.js';

export const providers={kairogen:{name:'KAIROGEN',url:'https://mcp.kairogen.ai/mcp',scope:'openid profile email kairogen:read kairogen:generate'},hubpost:{name:'HubPost',url:'https://mcp.hubpost.co/mcp',scope:'posts:read posts:write media:write'}};
export type Provider=keyof typeof providers;
type Connection={client?:OAuthClientInformationMixed;tokens?:OAuthTokens;verifier?:string;state?:string;startedAt?:number;redirectUrl?:string;tools?:{name:string;description?:string;inputSchema:Record<string,unknown>}[]};
export function providerName(value:unknown):Provider{if(value!=='kairogen'&&value!=='hubpost')throw new HttpError(400,'Serviço inválido.');return value;}
async function connection(provider:Provider):Promise<Connection>{const rows=await sql()`SELECT payload FROM fv_connections WHERE provider=${provider}`;return rows[0]?decrypt<Connection>(rows[0].payload):{};}
async function persist(provider:Provider,value:Connection){await sql()`INSERT INTO fv_connections(provider,payload) VALUES(${provider},${encrypt(value)}) ON CONFLICT(provider) DO UPDATE SET payload=excluded.payload,updated_at=now()`;}
function oauthProvider(provider:Provider,value:Connection,origin:string){
  let redirect:string|undefined;
  const api:OAuthClientProvider={
    redirectUrl:value.redirectUrl||`${origin}/api/oauth-callback?provider=${provider}`,
    clientMetadata:{client_name:'Fábrica Viral',redirect_uris:[value.redirectUrl||`${origin}/api/oauth-callback?provider=${provider}`],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none',scope:providers[provider].scope} as OAuthClientMetadata,
    state:()=>value.state!,
    clientInformation:()=>value.client,
    saveClientInformation:async client=>{value.client=client;await persist(provider,value);},
    tokens:()=>value.tokens,
    saveTokens:async tokens=>{value.tokens=tokens;await persist(provider,value);},
    redirectToAuthorization:url=>{redirect=url.toString();},
    saveCodeVerifier:async verifier=>{value.verifier=verifier;await persist(provider,value);},
    codeVerifier:()=>{if(!value.verifier)throw new Error('Autorização expirada. Conecte novamente.');return value.verifier;},
    invalidateCredentials:async scope=>{if(scope==='all'||scope==='tokens')delete value.tokens;if(scope==='all'||scope==='client')delete value.client;if(scope==='all'||scope==='verifier')delete value.verifier;await persist(provider,value);}
  };
  return {api,authorizationUrl:()=>redirect};
}
export async function startConnection(provider:Provider,origin:string){
  const value=await connection(provider);
  value.state=randomBytes(32).toString('hex');value.startedAt=Date.now();
  const target=`${origin}/api/oauth-callback?provider=${provider}`;
  if(value.redirectUrl!==target){delete value.client;delete value.tokens;}
  value.redirectUrl=target;delete value.verifier;await persist(provider,value);
  const flow=oauthProvider(provider,value,origin);
  const result=await auth(flow.api,{serverUrl:providers[provider].url,scope:providers[provider].scope});
  if(result==='AUTHORIZED')return {connected:true};
  const url=flow.authorizationUrl();if(!url)throw new HttpError(502,'O serviço não retornou uma autorização.');
  return {authorizationUrl:url};
}
export async function finishConnection(provider:Provider,code:string,state:string,origin:string){
  const value=await connection(provider);
  if(!value.state||state!==value.state||!value.startedAt||Date.now()-value.startedAt>15*60000)throw new HttpError(400,'Autorização inválida ou expirada. Conecte novamente.');
  const flow=oauthProvider(provider,value,origin);
  await auth(flow.api,{serverUrl:providers[provider].url,authorizationCode:code,scope:providers[provider].scope});
  delete value.state;delete value.verifier;delete value.startedAt;await persist(provider,value);
  return refreshConnection(provider,origin);
}
async function withClient<T>(provider:Provider,origin:string,work:(client:Client)=>Promise<T>){
  const value=await connection(provider);if(!value.tokens)throw new HttpError(409,'Conecte sua conta primeiro.');
  const flow=oauthProvider(provider,value,origin);
  const client=new Client({name:'fabrica-viral',version:'1.0.0'});
  const transport=new StreamableHTTPClientTransport(new URL(providers[provider].url),{authProvider:flow.api});
  try{await client.connect(transport,{timeout:20000});return await work(client);}finally{await client.close().catch(()=>{});}
}
export async function refreshConnection(provider:Provider,origin:string){
  const tools=await withClient(provider,origin,async client=>(await client.listTools()).tools.map(t=>({name:t.name,description:t.description,inputSchema:t.inputSchema as Record<string,unknown>})));
  const value=await connection(provider);value.tools=tools;await persist(provider,value);
  return {provider,connected:true,tools:tools.map(t=>t.name)};
}
export async function connectionsStatus(){return Promise.all((Object.keys(providers) as Provider[]).map(async provider=>{const value=await connection(provider);return {provider,name:providers[provider].name,connected:!!value.tokens,tools:(value.tools||[]).map(t=>t.name)};}));}
export async function disconnect(provider:Provider){await sql()`DELETE FROM fv_connections WHERE provider=${provider}`;return {disconnected:true};}
const readOnly={kairogen:['list_models','get_credits','get_generation','estimate_cost'],hubpost:['get_account','list_social_accounts','list_posts','get_post','get_analytics']};
const writes={kairogen:['generate_image','generate_video'],hubpost:['create_post']};
export async function callProvider(provider:Provider,operation:string,args:Record<string,unknown>,confirmed:boolean,origin:string){
  const isWrite=writes[provider].includes(operation);
  if(!readOnly[provider].includes(operation)&&!isWrite)throw new HttpError(400,'Operação não permitida.');
  if(isWrite && !confirmed)throw new HttpError(400,'Revise e confirme a operação antes de continuar.');
  const value=await connection(provider);
  if(!value.tools?.some(t=>t.name===operation))throw new HttpError(409,'Essa função ainda não está disponível nesta conexão. Atualize a conexão ou use o serviço diretamente.');
  // Async generation avoids holding a Vercel request for the full render duration.
  const parameters=provider==='kairogen'&&isWrite?{...args,wait_for_completion:false}:args;
  const jobId=isWrite?crypto.randomUUID():null;
  if(jobId)await sql()`INSERT INTO fv_jobs(id,provider,kind,status) VALUES(${jobId},${provider},${operation},'enviando')`;
  try{
    const result=await withClient(provider,origin,client=>client.callTool({name:operation,arguments:parameters},undefined,{timeout:45000}));
    if(jobId)await sql()`UPDATE fv_jobs SET status=${result.isError?'erro':'enviado'},result=${JSON.stringify(result)}::jsonb WHERE id=${jobId}`;
    return {jobId,result};
  }catch{
    if(jobId)await sql()`UPDATE fv_jobs SET status='verificar_no_provedor' WHERE id=${jobId}`;
    throw new HttpError(502,'O serviço não confirmou a operação. Confira o histórico no provedor antes de tentar novamente, para evitar duplicidade.');
  }
}
