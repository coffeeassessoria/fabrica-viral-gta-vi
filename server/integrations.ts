import {randomBytes} from 'node:crypto';
import {dispatchPublication} from './posting-jobs.js';
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
  const tools=await withClient(provider,origin,async client=>{const result:Connection['tools']=[];let cursor:string|undefined;do{const page=await client.listTools({cursor});result.push(...page.tools.map(t=>({name:t.name,description:t.description,inputSchema:t.inputSchema as Record<string,unknown>})));cursor=page.nextCursor;}while(cursor);return result;});
  const value=await connection(provider);value.tools=tools;await persist(provider,value);
  return {provider,connected:true,tools:tools.map(t=>t.name)};
}
export async function connectionsStatus(){return Promise.all((Object.keys(providers) as Provider[]).map(async provider=>{const value=await connection(provider);return {provider,name:providers[provider].name,connected:!!value.tokens,tools:(value.tools||[]).map(t=>t.name)};}));}
export async function disconnect(provider:Provider){await sql()`DELETE FROM fv_connections WHERE provider=${provider}`;return {disconnected:true};}
const readOnly:Record<Provider,string[]>={kairogen:[],hubpost:['get_account','list_social_accounts','list_posts','get_post','get_analytics','list_media']};
const writes:Record<Provider,string[]>={kairogen:[],hubpost:['create_post','get_upload_url','confirm_upload']};
export async function connectionTools(provider:Provider){const value=await connection(provider);return value.tokens?value.tools||[]:[];}
export async function callProvider(provider:Provider,operation:string,args:Record<string,unknown>,confirmed:boolean,origin:string,requestId?:string){
  const isWrite=writes[provider].includes(operation);
  if(!readOnly[provider].includes(operation)&&!isWrite)throw new HttpError(400,'Operação não permitida.');
  if(isWrite && !confirmed)throw new HttpError(400,'Revise e confirme a operação antes de continuar.');
  const value=await connection(provider);
  if(!value.tools?.some(t=>t.name===operation))throw new HttpError(409,'Essa função ainda não está disponível nesta conexão. Atualize a conexão ou use o serviço diretamente.');
  const execute=()=>withClient(provider,origin,client=>client.callTool({name:operation,arguments:args},undefined,{timeout:45000}));
  if(operation==='create_post'){if(!requestId)throw new HttpError(400,'Revise a publicação antes de confirmar.');return dispatchPublication(requestId,args,execute);}
  try{return {jobId:null,result:await execute()};}
  catch{throw new HttpError(502,'Não foi possível consultar o HubPost. Verifique a conexão e tente novamente.');}
}

// Internal capability: never route arbitrary browser calls to generation tools.
export async function kairogenCall(operation:string,args:Record<string,unknown>,origin:string){
 if(!['estimate_cost','generate_video','get_generation','list_models','get_credits','get_subscription_status'].includes(operation))throw new HttpError(400,'Operação KAIROGEN não permitida.');
 const tools=await connectionTools('kairogen');if(!tools.some(t=>t.name===operation))throw new HttpError(409,'Ferramenta indisponível nesta conexão.');
 return withClient('kairogen',origin,client=>client.callTool({name:operation,arguments:args},undefined,{timeout:25000}));
}
