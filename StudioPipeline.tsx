import {useEffect,useState} from 'react';
import {api} from './persistence/client';
import {scriptScenes} from './persistence/scenes';
import type {ProductionItem} from './persistence/production';
type Scene={jobId:string;label:string;prompt:string;scriptDuration:number;duration:number;cost:number};
type Batch={id:string;itemId:string;title:string;status:string;total:number;scenes:Scene[];scriptSnapshot:string;expiresAt:string;reason:string};
type Job={id:string;itemId:string;batchId?:string;status:string;urls:string[];externalId?:string;cost:number};
const labels:Record<string,string>={quoted:'Orçamento para aprovar',queued:'Na fila',running:'Produzindo cenas',paused:'Precisa da sua atenção',review:'Cenas prontas para revisar',approved:'Cenas revisadas',cancelled:'Produção encerrada',processing:'Gerando na KAIROGEN',sending:'Enviando',uncertain:'Envio sem confirmação',failed:'Falha na geração',completed:'Vídeo recebido'};
const snapshot=(p:ProductionItem)=>JSON.stringify({id:p.id,title:p.title,hook:p.hook,script:p.script,caption:p.caption,hashtags:p.hashtags});
export default function StudioPipeline({item,save}:{item:ProductionItem;save:()=>Promise<boolean>}){
 const [batches,setBatches]=useState<Batch[]>([]),[jobs,setJobs]=useState<Job[]>([]),[quote,setQuote]=useState<Batch|null>(null),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const signature=snapshot(item),scenes=scriptScenes(item.script);
 const existing=batches.find(b=>b.itemId===item.id&&b.status!=='quoted');
 const pending=existing&&['queued','running','paused','review'].includes(existing.status);
 const standalone=jobs.filter(j=>j.itemId===item.id&&!j.batchId);
 const needsResolution=standalone.some(j=>['sending','processing','uncertain'].includes(j.status));
 async function reload(){const result=await api('production.operation',{operation:'list'});setBatches(result.batches);setJobs(result.jobs);}
 useEffect(()=>{let alive=true;const poll=()=>api('production.operation',{operation:'list'}).then(r=>{if(alive){setBatches(r.batches);setJobs(r.jobs);}}).catch(e=>{if(alive)setMessage(e.message);});void poll();const t=setInterval(()=>{if(!document.hidden)void poll();},15000);return()=>{alive=false;clearInterval(t);};},[]);
 useEffect(()=>{setQuote(null);setConsent(false);setMessage('');},[item.id,signature]);
 async function run(fn:()=>Promise<void>){setBusy(true);setMessage('');try{await fn();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 async function action(operation:string,batchId:string,confirmed=false){await api('production.operation',{operation,batchId,confirmed});await reload();}
 const currentQuote=quote?.scriptSnapshot===signature?quote:null;
 const step=pending?(existing!.status==='review'?3:2):currentQuote?1:existing?.status==='approved'?3:0;
 return <section className="card p-6 space-y-5" aria-labelledby="line-title" aria-busy={busy}>
  <div><p className="eyebrow">LINHA DE PRODUÇÃO</p><h3 id="line-title" className="font-display text-3xl mt-3">Do roteiro às cenas, em uma aprovação</h3><p className="text-muted mt-2">Revise a história, confira o orçamento completo e deixe a fila trabalhar. Você volta para revisar os vídeos recebidos.</p></div>
  <ol className="production-stages" aria-label="Etapas da produção">{['Roteiro','Orçamento','Produção','Revisão final'].map((label,i)=><li key={label} aria-current={i===step?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol>
  {!pending&&<>
   <div><h4 className="font-display text-2xl">1. Revise o episódio</h4><p className="mt-2">{scenes.length} {scenes.length===1?'cena identificada':'cenas identificadas'} · {item.title}</p><details className="mt-3"><summary>Ler roteiro completo</summary><pre className="whitespace-pre-wrap break-words mt-3">{item.script||'Preencha o roteiro no editor abaixo.'}</pre></details></div>
   <p className="text-muted text-sm">Configuração da linha: Veo 3.1 Lite · plano Pro · vertical 9:16 · 720p · áudio. Cenas curtas usam a próxima duração disponível do modelo; os cortes ficam para a montagem.</p>
   <button className="primary-button" disabled={busy||!item.script.trim()||needsResolution} onClick={()=>void run(async()=>{if(!await save())throw new Error('Aguarde o salvamento antes de continuar.');const q=await api('production.operation',{operation:'quote',itemId:item.id,scriptSnapshot:signature});setQuote(q);setConsent(false);await reload();})}>{busy?'Consultando…':existing?.status==='approved'?'Calcular nova produção deste episódio':'Calcular orçamento do episódio'}</button>
   <p className="text-muted text-sm">Consultar o orçamento não gera vídeos nem consome créditos de geração.</p>
  </>}
  {currentQuote&&!pending&&<div className="space-y-4">
   <h4 className="font-display text-2xl">2. Uma aprovação para todas as cenas</h4><p><strong>{currentQuote.total} créditos no total</strong> · {currentQuote.scenes.length} cenas. Válido até {new Date(currentQuote.expiresAt).toLocaleTimeString('pt-BR')}.</p>
   <ul className="production-scenes">{currentQuote.scenes.map(s=><li key={s.jobId}><span>{s.label}<small className="text-muted block">{s.duration}s de geração{s.duration!==s.scriptDuration?` para ${s.scriptDuration}s de montagem`:''}</small></span><strong>{s.cost} créditos</strong></li>)}</ul>
   <details><summary>Conferir descrições que serão enviadas</summary>{currentQuote.scenes.map(s=><div key={s.jobId} className="mt-4"><h5>{s.label}</h5><pre className="whitespace-pre-wrap break-words mt-2">{s.prompt}</pre></div>)}</details>
   <label className="generation-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span>Aprovo este roteiro e autorizo gerar as {currentQuote.scenes.length} cenas, até {currentQuote.total} créditos, sem confirmar cada cena. Mudanças de preço e falhas devem pausar a fila.</span></label>
   <button className="primary-button" disabled={busy||!consent||Date.parse(currentQuote.expiresAt)<Date.now()} onClick={()=>void run(async()=>{const id=currentQuote.id;setConsent(false);try{await action('start',id,true);setQuote(null);setMessage('Episódio na fila. Você pode fechar a página e acompanhar depois.');}finally{await reload();}})}>Aprovar e iniciar produção</button>
  </div>}
  {existing&&<div className="space-y-4"><h4 className="font-display text-2xl">{labels[existing.status]||existing.status}</h4><p>{existing.scenes.filter(s=>jobs.find(j=>j.id===s.jobId)?.status==='completed').length} de {existing.scenes.length} cenas recebidas · orçamento aprovado: {existing.total} créditos.</p>{existing.reason&&<p className="text-warning">{existing.reason}</p>}
   {['queued','running'].includes(existing.status)&&<p className="text-muted">A fila continua no servidor mesmo com a página fechada. Só pediremos sua atenção se houver um impedimento.</p>}
   <div className="flex flex-wrap gap-3"><button className="text-link" disabled={busy} onClick={()=>void run(reload)}>Atualizar andamento</button>{['queued','running','paused'].includes(existing.status)&&<button className="text-link" disabled={busy} onClick={()=>void run(()=>action('resume',existing.id))}>Retomar acompanhamento</button>}{['queued','running'].includes(existing.status)&&<button className="text-link" disabled={busy} onClick={()=>void run(()=>action('pause',existing.id))}>Pausar próximas cenas</button>}</div>
   <ul className="production-scenes">{existing.scenes.map(s=>{const job=jobs.find(j=>j.id===s.jobId);return <li key={s.jobId} className="production-scene-result"><div className="flex flex-wrap justify-between gap-3"><strong>{s.label}</strong><span>{job?labels[job.status]||job.status:'Aguardando na fila'}</span></div>{job?.urls.map(url=><video key={url} controls playsInline preload="none" src={url} aria-label={`Vídeo ${s.label}`} className="w-full rounded-lg"/>)}{job?.externalId&&['processing','uncertain','failed'].includes(job.status)&&<button className="text-link" disabled={busy} onClick={()=>void run(async()=>{await api('generation.operation',{operation:'refresh',jobId:job.id});await reload();})}>Consultar resultado desta cena</button>}</li>;})}</ul>
   {existing.status==='paused'&&<details><summary>Encerrar fila e preservar resultados</summary><p className="text-muted mt-3">As próximas cenas serão interrompidas. Um envio em andamento pode terminar. Calcular uma nova produção prepara todas as cenas novamente; confira os vídeos existentes antes de aprovar outro custo.</p><button className="text-link mt-3" disabled={busy} onClick={()=>void run(()=>action('cancel',existing.id,true))}>Encerrar esta produção</button></details>}
   {existing.status==='review'&&<><p>Assista às cenas e confira falas, personagens e continuidade. Os arquivos ainda precisam de montagem para formar o vídeo final.</p><button className="primary-button" disabled={busy} onClick={()=>void run(()=>action('finish',existing.id,true))}>Concluir revisão das cenas</button></>}
   {existing.status==='approved'&&<p className="text-muted">Revisão registrada. A montagem e a publicação são etapas separadas; nenhum vídeo foi publicado automaticamente.</p>}
  </div>}
  {standalone.length>0&&<details open={needsResolution}><summary>Cenas avulsas anteriores ({standalone.length})</summary><p className="text-muted mt-3">Estes envios já existem. Consulte o resultado antes de iniciar um episódio completo, para evitar gerar novamente a mesma cena.</p>{standalone.map(j=><article className="mt-4 space-y-3" key={j.id}><p>{labels[j.status]||j.status} · {j.cost} créditos autorizados</p>{j.externalId&&<button className="text-link" disabled={busy} onClick={()=>void run(async()=>{await api('generation.operation',{operation:'refresh',jobId:j.id});await reload();})}>Consultar cena anterior</button>}{j.urls.map(url=><video key={url} controls playsInline preload="none" src={url} className="w-full rounded-lg" aria-label="Vídeo de geração anterior"/>)}</article>)}</details>}
  <p className="text-muted text-sm">Checagem automática: retorno da KAIROGEN e link do vídeo. A qualidade visual e a continuidade são revisadas por você ao final. Não há montagem nem postagem automática nesta etapa.</p>
  <p role="status" className="text-warning">{busy?'Aguarde a confirmação do servidor…':message}</p>
 </section>;
}
