import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {api,ApiError} from './client';
import {validateWorkspace,type Workspace} from './schema';
type Snapshot={revision:number;state:Workspace|null;updatedAt:string|null};
const DRAFT='fabrica-viral:draft:v1';
type Draft={revision:number|null;state:Workspace};
export function useWorkspacePersistence(state:Workspace,apply:(next:Workspace)=>void){
  const [loading,setLoading]=useState(true),[isSaving,setSaving]=useState(false),[saveMsg,setMessage]=useState('');
  const [connectionStatus,setConnection]=useState<'connecting'|'connected'|'unavailable'>('connecting');
  const [dirty,setDirty]=useState(false),[conflict,setConflict]=useState(false),[storageNotice,setStorageNotice]=useState('');
  const snapshot=useRef(state),revision=useRef<number|null>(null),confirmed=useRef(''),ready=useRef(false),busy=useRef(false),conflicted=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),run=useRef(0);
  const initial=useRef(state),flushRef=useRef<(manual?:boolean)=>Promise<boolean>>(async()=>false);
  function readDraft():Draft|null{try{const raw=localStorage.getItem(DRAFT);if(!raw)return null;const parsed=JSON.parse(raw);if(parsed.revision!==null&&!Number.isSafeInteger(parsed.revision))throw new Error();return {revision:parsed.revision,state:validateWorkspace(parsed.state)};}catch{setStorageNotice('Não foi possível ler o rascunho do navegador. Os dados do banco serão preservados.');return null;}}
  function draft(){try{localStorage.setItem(DRAFT,JSON.stringify({revision:revision.current,state:snapshot.current}));}catch{setStorageNotice('O navegador não permitiu guardar o rascunho. Aguarde a confirmação do salvamento antes de fechar.');}}
  function clearDraft(signature:string){try{const current=localStorage.getItem(DRAFT);if(current&&JSON.stringify(validateWorkspace(JSON.parse(current).state))===signature)localStorage.removeItem(DRAFT);}catch{/* Keep an unreadable draft instead of deleting it. */}}
  function schedule(){if(timer.current)clearTimeout(timer.current);if(!conflicted.current)timer.current=setTimeout(()=>void flushRef.current(),700);}
  useEffect(()=>{
    const id=++run.current;
    const cached=readDraft();
    api<Snapshot>('workspace.load').then(saved=>{
      if(id!==run.current)return;
      const server=saved.state?validateWorkspace(saved.state):initial.current;
      revision.current=saved.revision;confirmed.current=saved.state?JSON.stringify(server):'';
      let restored=server;
      if(cached&&JSON.stringify(cached.state)!==confirmed.current){
        restored=cached.state;
        if(cached.revision!==saved.revision && saved.state){conflicted.current=true;setConflict(true);setMessage('Há uma versão mais recente no banco. Seu rascunho foi preservado; baixe-o antes de carregar a versão salva.');}
      }else if(cached)clearDraft(confirmed.current);
      snapshot.current=restored;apply(restored);ready.current=true;setLoading(false);setConnection('connected');setDirty(JSON.stringify(restored)!==confirmed.current);
      if(JSON.stringify(restored)!==confirmed.current){draft();schedule();}
    }).catch(()=>{
      if(id!==run.current)return;
      if(cached){snapshot.current=cached.state;revision.current=cached.revision;apply(cached.state);}
      ready.current=true;setLoading(false);setConnection('unavailable');setDirty(true);setMessage('Não foi possível abrir o banco. Seu rascunho ficará no navegador até reconectar.');
    });
    return ()=>{run.current++;if(timer.current)clearTimeout(timer.current);};
  },[apply]);
  useLayoutEffect(()=>{
    if(!ready.current||loading)return;
    snapshot.current=validateWorkspace(state);
    if(JSON.stringify(state)!==confirmed.current){setDirty(true);draft();schedule();}
  },[state,loading]);
  async function flush(manual=false){
    if(!ready.current||busy.current||conflicted.current)return false;
    if(timer.current)clearTimeout(timer.current);
    busy.current=true;setSaving(true);
    const next=snapshot.current,signature=JSON.stringify(next);
    try{
      if(revision.current===null){
        const saved=await api<Snapshot>('workspace.load');
        if(saved.state&&JSON.stringify(saved.state)!==signature)throw new ApiError(409,'O banco possui outra versão. Baixe seu rascunho e carregue os dados salvos.');
        revision.current=saved.revision;
      }
      const saved=await api<Snapshot>('workspace.save',{state:next,revision:revision.current});
      revision.current=saved.revision;confirmed.current=signature;setConnection('connected');
      if(JSON.stringify(snapshot.current)===signature){setDirty(false);clearDraft(signature);}else{draft();schedule();}
      if(manual)setMessage('Progresso salvo no banco. Você pode fechar e abrir a página.');else setMessage('');
      return true;
    }catch(error){
      const status=(error as ApiError).status;
      if(status===409){conflicted.current=true;setConflict(true);}
      setConnection('unavailable');setMessage(error instanceof Error?error.message:'Não foi possível salvar. Seu rascunho foi mantido.');draft();
      return false;
    }finally{busy.current=false;setSaving(false);}
  }
  flushRef.current=flush;
  useEffect(()=>{const online=()=>void flushRef.current();window.addEventListener('online',online);const retry=setInterval(()=>{if(ready.current&&!conflicted.current&&JSON.stringify(snapshot.current)!==confirmed.current)void flushRef.current();},15000);return()=>{window.removeEventListener('online',online);clearInterval(retry);};},[]);
  function exportBackup(){const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),revision:revision.current,state:snapshot.current},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`fabrica-viral-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
  async function loadSaved(){exportBackup();try{const saved=await api<Snapshot>('workspace.load');if(!saved.state)return;const next=validateWorkspace(saved.state);revision.current=saved.revision;confirmed.current=JSON.stringify(next);snapshot.current=next;conflicted.current=false;setConflict(false);localStorage.removeItem(DRAFT);apply(next);setDirty(false);setConnection('connected');setMessage('Versão salva carregada. O rascunho anterior foi baixado como backup.');}catch{setMessage('Não foi possível carregar o banco. O rascunho foi preservado.');}}
  return {loading,isSaving,saveMsg,connectionStatus,dirty,conflict,storageNotice,saveAll:()=>flush(true),exportBackup,loadSaved};
}
