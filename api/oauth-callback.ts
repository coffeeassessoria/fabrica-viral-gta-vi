import type {IncomingMessage,ServerResponse} from 'node:http';
import {requireSession} from '../server/security.js';
import {finishConnection,providerName} from '../server/integrations.js';
import {originFor} from '../server/actions.js';
export default async function callback(req:IncomingMessage,res:ServerResponse){
  const origin=originFor(req);
  try{requireSession(req);const url=new URL(req.url!,origin);const provider=providerName(url.searchParams.get('provider'));if(url.searchParams.has('error'))throw new Error('Autorização recusada.');await finishConnection(provider,url.searchParams.get('code')||'',url.searchParams.get('state')||'',origin);res.statusCode=303;res.setHeader('Location','/?integracao=conectada');res.setHeader('Cache-Control','no-store');res.end();}
  catch{res.statusCode=303;res.setHeader('Location','/?integracao=falhou');res.setHeader('Cache-Control','no-store');res.end();}
}
