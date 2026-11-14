import {productionQueue} from '../server/production-queue.js';
import {productionTick} from '../server/production-line.js';
import {workspaceId} from '../server/database.js';
export default productionQueue.handleNodeCallback<{batchId:string;workspaceId:string}>(async(message)=>{
 if(message.workspaceId!==workspaceId()||!/^[\da-f-]{36}$/i.test(message.batchId))return;
 const pending=await productionTick(message.batchId,process.env.APP_ORIGIN||'https://fabrica-viral-gta-vi.vercel.app');
 if(pending)throw new Error('Production pending');
},{visibilityTimeoutSeconds:120,retry:()=>({afterSeconds:30})});
