import {createHmac,timingSafeEqual,scryptSync,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {HttpError,sql} from './database.js';
const COOKIE='fv_session';
export function sessionSecret(){if(!process.env.SESSION_SECRET)throw new HttpError(503,'A proteção de acesso ainda não foi configurada.');return process.env.SESSION_SECRET;}
function signature(data:string){return createHmac('sha256',sessionSecret()).update(data).digest('base64url');}
function equal(a:string,b:string){return a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function session(req:IncomingMessage){
  const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!token)return null;
  const [data,sig]=token.split('.');if(!data||!sig||!equal(signature(data),sig))return null;
  try{const s=JSON.parse(Buffer.from(data,'base64url').toString());return s.exp>Date.now() && s.user==='admin'?s:null;}catch{return null;}
}
export function requireSession(req:IncomingMessage){const value=session(req);if(!value)throw new HttpError(401,'Entre na sua conta para continuar.');return value;}
export function setSession(res:ServerResponse,secure:boolean){const data=Buffer.from(JSON.stringify({user:'admin',exp:Date.now()+7*86400000,nonce:randomBytes(16).toString('hex')})).toString('base64url');res.setHeader('Set-Cookie',`${COOKIE}=${data}.${signature(data)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure?'; Secure':''}`);}
export function clearSession(res:ServerResponse,secure:boolean){res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`);}
export async function login(password:unknown,ip:string){
  if(typeof password!=='string'||password.length>500)throw new HttpError(400,'Informe seu código de acesso.');
  const key=createHmac('sha256',sessionSecret()).update(ip).digest('hex');
  const attempts=await sql()`INSERT INTO fv_login_limits(key,count,window_start) VALUES(${key},1,now()) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN fv_login_limits.window_start<now()-interval '15 minutes' THEN 1 ELSE fv_login_limits.count+1 END,window_start=CASE WHEN fv_login_limits.window_start<now()-interval '15 minutes' THEN now() ELSE fv_login_limits.window_start END RETURNING count`;
  if(attempts[0].count>10)throw new HttpError(429,'Muitas tentativas. Aguarde 15 minutos e tente novamente.');
  const [salt,hash]=process.env.ADMIN_PASSWORD_HASH?.split(':')||[];
  if(!salt||!hash)throw new HttpError(503,'O acesso ainda não foi configurado.');
  const actual=scryptSync(password,salt,64).toString('hex');
  if(!equal(actual,hash))throw new HttpError(401,'Código de acesso incorreto.');
  await sql()`DELETE FROM fv_login_limits WHERE key=${key}`;
}
function encryptionKey(){const key=Buffer.from(process.env.TOKEN_ENCRYPTION_KEY||'','base64');if(key.length!==32)throw new HttpError(503,'A proteção das conexões ainda não foi configurada.');return key;}
export function encrypt(value:unknown){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);return Buffer.concat([iv,cipher.update(JSON.stringify(value)),cipher.final(),cipher.getAuthTag()]).toString('base64');}
export function decrypt<T>(value:string):T{const data=Buffer.from(value,'base64'),decipher=createDecipheriv('aes-256-gcm',encryptionKey(),data.subarray(0,12));decipher.setAuthTag(data.subarray(-16));return JSON.parse(Buffer.concat([decipher.update(data.subarray(12,-16)),decipher.final()]).toString());}
