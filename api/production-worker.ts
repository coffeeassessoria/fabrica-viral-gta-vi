import {productionQueue,verifyProductionMessage,type ProductionMessage} from '../server/production-queue.js';
import {productionTick} from '../server/production-line.js';
export default productionQueue.handleNodeCallback<ProductionMessage>(async(message)=>{
 if(!verifyProductionMessage(message))return;
 const pending=await productionTick(message.batchId,process.env.APP_ORIGIN||'https://fabrica-viral-gta-vi.vercel.app');
 if(pending)throw new Error('Production pending');
},{visibilityTimeoutSeconds:120,retry:()=>({afterSeconds:30})});
