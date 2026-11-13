import {connectionsStatus,connectionTools} from './integrations.js';
import {buildPublicationArguments,type PostingMode,type JsonSchema} from './hubpost-contract.js';
export async function hubpostCapabilities(){
  const [connection]=await connectionsStatus();
  const tools=await connectionTools('hubpost'),create=tools.find(tool=>tool.name==='create_post');
  const modes:PostingMode[]=[];let reason='';
  if(create){for(const mode of ['draft','schedule','publish'] as PostingMode[]){try{buildPublicationArguments({accountId:'capability-check',platform:'tiktok',caption:'Verificação de formato, sem envio.',mediaUrl:'https://example.com/format-check.mp4',mode,scheduledAt:new Date(Date.now()+86400000).toISOString()},create.inputSchema as JsonSchema);modes.push(mode);}catch(error){reason=(error as Error).message;}}}
  if(modes.length)reason='';
  if(connection?.connected&&!create)reason='O HubPost ainda não liberou create_post nesta conta.';
  return {connected:!!connection?.connected,modes,reason,analytics:tools.some(tool=>tool.name==='get_analytics'),tools:tools.map(tool=>tool.name),schemas:Object.fromEntries(tools.filter(tool=>['create_post','list_social_accounts','list_posts','list_media','get_upload_url','confirm_upload'].includes(tool.name)).map(tool=>[tool.name,tool.inputSchema]))};
}
