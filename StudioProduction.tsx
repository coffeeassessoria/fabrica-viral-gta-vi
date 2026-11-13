import {useState} from 'react';
import {productionStatuses,claudePackage,type ProductionItem} from './persistence/production';
import {preparedWeek} from './data/prepared-week';
type Props={items:ProductionItem[];onChange:(items:ProductionItem[])=>void;onUseCalendar:(items:ProductionItem[])=>void};
export default function StudioProduction({items,onChange,onUseCalendar}:Props){
  const [message,setMessage]=useState('');
  function update(index:number,field:keyof ProductionItem,value:string){onChange(items.map((item,i)=>i===index?{...item,[field]:value}:item));}
  function download(){const url=URL.createObjectURL(new Blob([claudePackage(items)],{type:'text/markdown;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='fabrica-viral-pacote-para-claude.md';link.click();setTimeout(()=>URL.revokeObjectURL(url),500);setMessage('Pacote baixado. Envie ao Claude para a produção dos vídeos.');}
  return <section className="space-y-5">
    <div><p className="eyebrow">ROTEIROS AQUI / VÍDEOS NO CLAUDE</p><h2 className="font-display text-4xl mt-3">Sua mesa de produção</h2><p className="text-muted mt-3">Cadastre os roteiros preparados nesta conversa, baixe o pacote para o Claude e registre os vídeos que ele devolver pela KAIROGEN. As edições são salvas automaticamente.</p></div>
    <div className="flex flex-wrap gap-4"><button className="primary-button" disabled={items.length>=100} onClick={()=>onChange([...items,{id:crypto.randomUUID(),title:'',day:'SEG',hook:'',script:'',caption:'',hashtags:'',videoUrl:'',status:'Rascunho'}])}>Adicionar roteiro</button>{items.length===0&&<button className="text-link" onClick={()=>onChange(preparedWeek)}>Carregar os sete roteiros preparados</button>}<button className="text-link" disabled={!items.length} onClick={download}>Baixar pacote para o Claude</button><button className="text-link" disabled={!items.length} onClick={()=>onUseCalendar(items)}>Usar títulos no calendário</button></div>
    {items.length===0&&<div className="card p-6"><h3 className="font-display text-2xl">Nenhum roteiro cadastrado</h3><p className="text-muted mt-2">Carregue a semana já preparada ou adicione um roteiro criado aqui. Nenhuma geração de IA será cobrada pelo painel.</p></div>}
    <div className="space-y-5">{items.map((item,index)=><article className="card p-6" key={item.id}>
      <div className="flex flex-wrap gap-3 items-center justify-between"><h3 className="font-display text-2xl">{item.title||`Roteiro ${index+1}`}</h3><span className="chip">{item.status}</span></div>
      <div className="grid md:grid-cols-3 gap-4 mt-4"><label className="block">Título<input value={item.title} maxLength={3000} onChange={e=>update(index,'title',e.target.value)}/></label><label className="block">Dia<select value={item.day} onChange={e=>update(index,'day',e.target.value)}>{['SEG','TER','QUA','QUI','SEX','SÁB','DOM'].map(day=><option key={day}>{day}</option>)}</select></label><label className="block">Etapa<select value={item.status} onChange={e=>update(index,'status',e.target.value)}>{productionStatuses.map(status=><option key={status}>{status}</option>)}</select></label></div>
      <label className="block mt-4">Gancho de 2 segundos<input value={item.hook} maxLength={3000} onChange={e=>update(index,'hook',e.target.value)}/></label>
      <div className="mt-4"><label htmlFor={`production-script-${index}`}>Roteiro para o Claude e KAIROGEN</label><textarea id={`production-script-${index}`} rows={8} value={item.script} maxLength={20000} onChange={e=>update(index,'script',e.target.value)}/></div>
      <div className="mt-4"><label htmlFor={`production-caption-${index}`}>Legenda</label><textarea id={`production-caption-${index}`} rows={3} value={item.caption} maxLength={10000} onChange={e=>update(index,'caption',e.target.value)}/></div>
      <label className="block mt-4">Hashtags<input value={item.hashtags} maxLength={3000} onChange={e=>update(index,'hashtags',e.target.value)}/></label>
      <label className="block mt-4">Link HTTPS do vídeo recebido<input type="url" value={item.videoUrl} placeholder="https://" maxLength={3000} onChange={e=>update(index,'videoUrl',e.target.value)}/></label>
      <p className="text-muted text-sm mt-2">Use um link compartilhável do vídeo final. Registrar o link não envia o arquivo às redes.</p>
      <button className="text-link mt-3" onClick={async()=>{try{await navigator.clipboard.writeText(claudePackage([item]));setMessage('Pacote deste roteiro copiado. Cole no Claude para produzir o vídeo.');}catch{setMessage('Não foi possível copiar. Use Baixar pacote para o Claude.');}}}>Copiar pacote deste roteiro</button>
    </article>)}</div>
    <p role="status" className="text-warning">{message}</p>
  </section>;
}
