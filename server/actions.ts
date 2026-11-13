import type {IncomingMessage,ServerResponse} from 'node:http';
import {loadWorkspace,saveWorkspace,legacyRecords,sql,HttpError} from './database.js';
import {session,requireSession,login,setSession,clearSession} from './security.js';
import {mediaOperation} from './media.js';
import {authoringQuote,generateWeek} from './authoring.js';
import {connectionsStatus,startConnection,refreshConnection,disconnect,providerName,callProvider} from './integrations.js';
export async function readBody(req:IncomingMessage){
  const preParsed=(req as IncomingMessage&{body?:unknown}).body;
  if(preParsed && typeof preParsed==='object'){if(Buffer.byteLength(JSON.stringify(preParsed))>512000)throw new HttpError(413,'O conteúdo excede o limite permitido.');return preParsed as Record<string,unknown>;}
  let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>512000)throw new HttpError(413,'O conteúdo excede o limite permitido.');}
  try{return JSON.parse(body);}catch{throw new HttpError(400,'Conteúdo inválido.');}
}
export function originFor(req:IncomingMessage){const host=req.headers.host||'';if(/^127\.0\.0\.1:\d+$/.test(host)||/^localhost:\d+$/.test(host))return `http://${host}`;if(process.env.APP_ORIGIN)return process.env.APP_ORIGIN;if(/^fabrica-viral-gta-vi[\w-]*\.vercel\.app$/.test(host))return `https://${host}`;return `https://${process.env.VERCEL_URL}`;}
export function send(res:ServerResponse,status:number,data:unknown){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));}
export default async function handler(req:IncomingMessage,res:ServerResponse){
  try{
    if(req.method!=='POST')throw new HttpError(405,'Método não permitido.');
    if(!req.headers['content-type']?.startsWith('application/json'))throw new HttpError(415,'Envie conteúdo JSON.');
    const requestOrigin=req.headers.origin;
    if(requestOrigin && requestOrigin!==originFor(req) && requestOrigin!==`https://${req.headers.host}`)throw new HttpError(403,'Origem não permitida.');
    const {action,args={}}=await readBody(req) as {action:string;args:Record<string,unknown>};
    const origin=originFor(req),secure=origin.startsWith('https:');
    if(action==='auth.session')return send(res,200,{data:{authenticated:!!session(req)}});
    if(action==='auth.login'){await login(args.password,String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'local'));setSession(res,secure);return send(res,200,{data:{authenticated:true}});}
    requireSession(req);
    if(action==='auth.logout'){clearSession(res,secure);return send(res,200,{data:{authenticated:false}});}
    if(action==='workspace.load')return send(res,200,{data:await loadWorkspace()});
    if(action==='workspace.save')return send(res,200,{data:await saveWorkspace(args.state,args.revision)});
    if(action.startsWith('records.'))return send(res,200,{data:await legacyRecords(action,args)});
    if(action==='media.operation')return send(res,200,{data:await mediaOperation(args,origin)});
    if(action==='authoring.quote')return send(res,200,{data:await authoringQuote()});
    if(action==='authoring.generate')return send(res,200,{data:await generateWeek(args.theme,args.confirmed)});
    if(action==='integrations.status')return send(res,200,{data:await connectionsStatus()});
    if(action==='integrations.connect')return send(res,200,{data:await startConnection(providerName(args.provider),origin)});
    if(action==='integrations.refresh')return send(res,200,{data:await refreshConnection(providerName(args.provider),origin)});
    if(action==='integrations.disconnect')return send(res,200,{data:await disconnect(providerName(args.provider))});
    if(action==='integrations.call')return send(res,200,{data:await callProvider(providerName(args.provider),String(args.operation),args.parameters as Record<string,unknown>||{},args.confirmed===true,origin)});
    if(action==='jobs.list'){const jobs=await sql()`SELECT id,provider,kind,status,result,created_at FROM fv_jobs ORDER BY created_at DESC LIMIT 30`;return send(res,200,{data:jobs});}
    throw new HttpError(400,'Ação desconhecida.');
  }catch(error){const known=error instanceof HttpError;return send(res,known?error.status:500,{error:known?error.message:'Não foi possível concluir agora. Seus dados não foram substituídos. Tente novamente.'});}
}
