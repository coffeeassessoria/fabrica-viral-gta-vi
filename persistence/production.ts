export const productionStatuses=['Rascunho','Roteiro pronto','Enviado ao Claude','Vídeo recebido','Aprovado'] as const;
export type ProductionItem={id:string;title:string;day:string;hook:string;script:string;caption:string;hashtags:string;videoUrl:string;status:typeof productionStatuses[number]};
export function validateProduction(value:unknown):ProductionItem[]{
  if(!Array.isArray(value)||value.length>100)throw new Error('Lista de produção inválida.');
  const ids=new Set<string>();
  return value.map(item=>{
    if(!item||typeof item!=='object')throw new Error('Roteiro inválido.');
    for(const field of ['id','title','day','hook','script','caption','hashtags','videoUrl','status']){
      if(typeof item[field]!=='string'||item[field].length>(field==='script'?20000:field==='caption'?10000:3000))throw new Error('Campo do roteiro inválido.');
    }
    if(!item.id||ids.has(item.id)||!productionStatuses.includes(item.status))throw new Error('Identificação ou etapa do roteiro inválida.');
    ids.add(item.id);
    // Drafts include partially typed URLs. Validate the final link before posting.
    return {id:item.id,title:item.title,day:item.day,hook:item.hook,script:item.script,caption:item.caption,hashtags:item.hashtags,videoUrl:item.videoUrl,status:item.status};
  });
}
export function claudePackage(items:ProductionItem[]){return `# Produção de vídeos — Fábrica Viral\n\nOs roteiros abaixo foram preparados e serão revisados no nosso fluxo editorial. Use a KAIROGEN conectada ao Claude para produzir as cenas. Antes de executar qualquer geração paga, consulte o custo e aguarde minha confirmação. Preserve os personagens e a continuidade. Não copie gameplay e não publique nas redes. Ao terminar, entregue os links dos vídeos, identificados pelo ID do roteiro.\n\n${items.map(item=>`## ${item.id} — ${item.title||'Sem título'}\nDia: ${item.day}\nGancho: ${item.hook}\n\n${item.script}\n\nLegenda: ${item.caption}\n${item.hashtags}`).join('\n\n---\n\n')}`;}
