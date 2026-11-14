import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
test('Pilotos: cenas isoladas com contexto, sem copiar o episódio inteiro',async()=>{
 const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom'});
 try{
  const {scriptScenes}=await vite.ssrLoadModule('/persistence/scenes.ts');
  const pilots=JSON.parse(await readFile('docs/pesquisa-2026-11-13/CONTEUDO-IMPORTADO-FV08-FV31.json','utf8')).filter(x=>['FV08','FV12','FV20'].includes(x.id));
  for(const pilot of pilots){const scenes=scriptScenes(pilot.script);assert.equal(scenes.length,7,pilot.id);assert.deepEqual(scenes.map(s=>s.duration),[2,5,5,6,6,6,6]);assert.ok(scenes[0].prompt.includes('Continuidade:'));assert.ok(scenes[0].prompt.includes('Brief visual'));assert.ok(!scenes[0].prompt.includes('Hashtags propostas'));assert.ok(!scenes[0].prompt.includes('Episódio 2 proposto'));assert.ok(!scenes[0].prompt.includes('Continuações'));assert.ok(scenes.every(s=>s.prompt.length<20000));}
  const rosa=scriptScenes(pilots.find(p=>p.id==='FV08').script);
  assert.ok(rosa[0].prompt.includes('Funcionário é pelos fundos'));assert.ok(!rosa[0].prompt.includes('Hoje eu não vim trabalhar'));assert.ok(rosa[1].prompt.includes('Hoje eu não vim trabalhar'));
  assert.deepEqual(scriptScenes(''),[]);assert.equal(scriptScenes('Uma cena livre')[0].prompt,'Uma cena livre');
  assert.equal(scriptScenes('| Tempo | Imagem/ação | Fala |\n|---|---|---|\n| 0-2s | Porta \\| janela | Silêncio |')[0].duration,2);
 }finally{await vite.close();}
});
