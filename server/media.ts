import {HttpError} from './database.js';
import {callProvider,connectionTools,providerName} from './integrations.js';
import {buildPublicationArguments,PublicationError,type PublicationInput,type JsonSchema} from './hubpost-contract.js';
export async function mediaOperation(input:Record<string,unknown>,origin:string){
  providerName(input.provider);
  if(input.operation==='get_upload_url'||input.operation==='confirm_upload'){
    if(input.confirmed!==true)throw new HttpError(400,'Confirme o envio do arquivo ao HubPost.');
    const parameters=input.parameters as Record<string,unknown>||{};
    if(input.operation==='get_upload_url'){
      if(!['video/mp4','video/webm','video/quicktime'].includes(String(parameters.contentType))||!Number.isSafeInteger(parameters.size)||(parameters.size as number)<=0||(parameters.size as number)>1073741824)throw new HttpError(400,'Selecione um vídeo MP4, WebM ou MOV de até 1 GB.');
      return callProvider('hubpost','get_upload_url',{contentType:parameters.contentType,size:parameters.size},true,origin);
    }
    if(typeof parameters.filePath!=='string'||!/^[a-z0-9-]+\.[a-z0-9]+$/.test(parameters.filePath)||typeof parameters.filename!=='string'||!parameters.filename.trim()||parameters.filename.length>200)throw new HttpError(400,'Dados de confirmação do vídeo inválidos.');
    return callProvider('hubpost','confirm_upload',{filePath:parameters.filePath,filename:parameters.filename},true,origin);
  }
  if(input.operation==='create_post'){
    if(input.confirmed!==true)throw new HttpError(400,'Revise a publicação e confirme antes de enviar.');
    if(typeof input.requestId!=='string'||!/^[0-9a-f-]{36}$/i.test(input.requestId))throw new HttpError(400,'Revise o envio para gerar uma identificação válida.');
    const tools=await connectionTools('hubpost'),tool=tools.find(tool=>tool.name==='create_post');
    if(!tool)throw new HttpError(409,'Sua conexão do HubPost ainda não liberou a publicação. Autorize e verifique a conta.');
    try{const args=buildPublicationArguments(input as unknown as PublicationInput,tool.inputSchema as JsonSchema);return await callProvider('hubpost','create_post',args,true,origin,input.requestId);}
    catch(error){if(error instanceof PublicationError)throw new HttpError(error.status,error.message);throw error;}
  }
  if(!['get_account','list_social_accounts','list_posts','get_post','get_analytics','list_media'].includes(String(input.operation)))throw new HttpError(400,'Ação de distribuição inválida. Os vídeos são produzidos no Claude.');
  return callProvider('hubpost',String(input.operation),input.parameters as Record<string,unknown>||{},false,origin);
}
