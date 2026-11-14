import {QueueClient} from '@vercel/queue';
import {workspaceId} from './database.js';
export const productionQueue=new QueueClient({region:'iad1'});
export async function dispatchProduction(batchId:string){
 await productionQueue.send('fabrica-production',{batchId,workspaceId:workspaceId()},{retentionSeconds:86400});
}
