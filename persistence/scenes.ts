export type ScriptScene={id:string;label:string;prompt:string;duration?:number};
const plain=(s:string)=>s.replace(/\*\*/g,'').trim();
function cells(line:string){return line.trim().replace(/^\|/,'').replace(/\|$/,'').split(/(?<!\\)\|/).map(s=>plain(s.replace(/\\\|/g,'|')));}
export function scriptScenes(script:string):ScriptScene[]{
 const text=script.replace(/\r\n?/g,'\n').trim();if(!text)return [];
 const paragraphs=text.split(/\n\s*\n/);
 const context=paragraphs.filter(p=>/^\*\*(?:Personagens(?: novos)?|Continuidade|Brief visual(?: para Claude\/KAIROGEN)?)\s*:/i.test(p.trim())).map(plain).join('\n\n');
 const lines=text.split('\n');const scenes:ScriptScene[]=[];
 for(let i=0;i<lines.length;i++){
  const header=cells(lines[i]);
  if(header.length!==3||!/^tempo$/i.test(header[0])||!/imagem|ação|acao/i.test(header[1])||!/fala|som|texto/i.test(header[2]))continue;
  for(let j=i+1;j<lines.length&&lines[j].trim().startsWith('|');j++){
   const row=cells(lines[j]);if(row.length!==3)continue;
   const time=row[0].match(/^(\d+(?:[.,]\d+)?)\s*[sS]?\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*[sS]?$/);
   if(!time||!row[1])continue;
   const start=Number(time[1].replace(',','.')),end=Number(time[2].replace(',','.'));if(end<=start)continue;
   const n=scenes.length+1;
   const prompt=[`Gere somente a cena ${n} abaixo, como um take de uma história original. Preserve os personagens e a continuidade descritos. Falas em português brasileiro. Textos de tela e inscrições indicados devem ser aplicados na edição, não desenhados pelo modelo.`,context,`Cena ${n} — trecho ${row[0]} do roteiro (duração de montagem: ${end-start}s).`,`Imagem e ação: ${row[1]}`,`Fala, som e indicações de edição: ${row[2]}`].filter(Boolean).join('\n\n');
   scenes.push({id:`scene-${n}`,label:`Cena ${n} · ${row[0]}`,duration:end-start,prompt});
  }
  if(scenes.length)return scenes;
 }
 return [{id:'scene-1',label:'Cena única · revisar trecho',prompt:text}];
}
