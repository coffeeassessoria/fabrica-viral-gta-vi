import { neon } from '@neondatabase/serverless';
import {validateWorkspace, toRecords, type Workspace} from '../persistence/schema.js';
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export function sql(){if(!process.env.DATABASE_URL)throw new HttpError(503,'O banco ainda não foi configurado.');return neon(process.env.DATABASE_URL);}
export const workspaceId=()=>process.env.WORKSPACE_ID||'main';
export async function loadWorkspace(){const rows=await sql()`SELECT revision,state,updated_at FROM fv_workspace WHERE id=${workspaceId()}`;return rows[0]?{revision:rows[0].revision,state:validateWorkspace(rows[0].state),updatedAt:rows[0].updated_at}:{revision:0,state:null,updatedAt:null};}
export async function saveWorkspace(raw:unknown,revision:unknown){
  let state:Workspace;try{state=validateWorkspace(raw);}catch(e){throw new HttpError(400,(e as Error).message);}
  if(!Number.isSafeInteger(revision) || (revision as number)<0)throw new HttpError(400,'Revisão inválida.');
  const current=await loadWorkspace();
  // Older open tabs must preserve newly introduced optional collections.
  if(state.production===undefined&&current.state?.production!==undefined)state={...state,production:current.state.production};
  if(JSON.stringify(current.state)===JSON.stringify(state))return current;
  const rows=await sql()`INSERT INTO fv_workspace(id,revision,state,updated_at) SELECT ${workspaceId()},1,${JSON.stringify(state)}::jsonb,now() WHERE ${revision}=0 ON CONFLICT(id) DO UPDATE SET revision=fv_workspace.revision+1,state=excluded.state,updated_at=now() WHERE fv_workspace.revision=${revision} RETURNING revision,state,updated_at`;
  // An existing workspace needs an UPDATE when revision is not zero.
  if(!rows[0] && revision!==0){
    const updated=await sql()`UPDATE fv_workspace SET revision=revision+1,state=${JSON.stringify(state)}::jsonb,updated_at=now() WHERE id=${workspaceId()} AND revision=${revision} RETURNING revision,state,updated_at`;
    if(updated[0])return {revision:updated[0].revision,state:updated[0].state,updatedAt:updated[0].updated_at};
  }
  if(!rows[0])throw new HttpError(409,'Existe uma versão mais recente salva. Baixe seu rascunho antes de recarregar os dados.');
  return {revision:rows[0].revision,state:rows[0].state,updatedAt:rows[0].updated_at};
}
export async function legacyRecords(action:string,args:Record<string,unknown>){
  const workspace=await loadWorkspace();
  const records=workspace.state?toRecords(workspace.state):null;
  const collection=args.collection as keyof NonNullable<typeof records>;
  if(!['fabrica_checklist','fabrica_calendario','fabrica_metricas','fabrica_rodar'].includes(collection))throw new HttpError(400,'Coleção inválida.');
  if(action==='records.list')return {records:records?[{id:collection,value:records[collection]}]:[]};
  throw new HttpError(409,'Use workspace.save para salvar as quatro coleções em uma única operação.');
}
