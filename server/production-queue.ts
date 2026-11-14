import {QueueClient} from '@vercel/queue';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {workspaceId} from './database.js';
export const productionQueue=new QueueClient({region:'iad1'});
export type ProductionMessage={batchId:string;workspaceId:string;signature:string};
export function signedProductionMessage(batchId:string):ProductionMessage{
 const secret=process.env.SESSION_SECRET;if(!secret)throw new Error('Worker authentication unavailable');
 const wid=workspaceId();return {batchId,workspaceId:wid,signature:createHmac('sha256',secret).update('fv-production-v1:'+wid+':'+batchId).digest('hex')};
}
export function verifyProductionMessage(message:ProductionMessage){
 if(!message||message.workspaceId!==workspaceId()||typeof message.batchId!=='string'||!/^[\da-f-]{36}$/i.test(message.batchId)||typeof message.signature!=='string'||!/^[\da-f]{64}$/i.test(message.signature))return false;
 const expected=signedProductionMessage(message.batchId).signature;return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(message.signature,'hex'));
}
export async function dispatchProduction(batchId:string){
 await productionQueue.send('fabrica-production',signedProductionMessage(batchId),{retentionSeconds:86400});
}
