import {createHash} from 'node:crypto';
import {sql,HttpError} from './database.js';
function canonical(value:unknown):unknown{if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));return value;}
export async function dispatchPublication(requestId:string,parameters:Record<string,unknown>,execute:()=>Promise<{isError?:boolean;[key:string]:unknown}>){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))throw new HttpError(400,'Revise o envio antes de confirmar.');
  const requestHash=createHash('sha256').update(JSON.stringify(canonical(parameters))).digest('hex');
  const reserved=await sql()`INSERT INTO fv_jobs(id,provider,kind,status,result) VALUES(${requestId},'hubpost','create_post','enviando',${JSON.stringify({requestHash})}::jsonb) ON CONFLICT(id) DO NOTHING RETURNING id`;
  if(!reserved.length){
    const [job]=await sql()`SELECT provider,kind,status,result FROM fv_jobs WHERE id=${requestId}`;
    if(job?.provider!=='hubpost'||job.kind!=='create_post'||job.result?.requestHash!==requestHash)throw new HttpError(409,'A revisão mudou. Prepare e confirme um novo envio.');
    if(job.result?.response)return {jobId:requestId,result:job.result.response};
    throw new HttpError(409,'Este envio já foi iniciado. Consulte o histórico no HubPost antes de criar outra publicação.');
  }
  let result;
  try{result=await execute();}
  catch{
    await sql()`UPDATE fv_jobs SET status='verificar_no_provedor' WHERE id=${requestId}`;
    throw new HttpError(502,'O HubPost não confirmou o resultado. Consulte o histórico antes de preparar outro envio; repetir esta confirmação não publicará de novo.');
  }
  // If recording the response fails, keep the reserved ID: a retry must never resend.
  await sql()`UPDATE fv_jobs SET status=${result.isError?'erro':'enviado'},result=${JSON.stringify({requestHash,response:result})}::jsonb WHERE id=${requestId}`;
  return {jobId:requestId,result};
}
