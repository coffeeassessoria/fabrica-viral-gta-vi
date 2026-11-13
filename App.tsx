import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame, Sparkles, CalendarDays, PenLine, BarChart3, CheckCircle2, Copy, Zap, Target, Clock, Play, TrendingUp, MessageCircle, Eye, Users, ChevronRight, Save, RefreshCw, Brain, Clapperboard, Cloud, Network, Share2, MonitorPlay, CalendarCheck, Cpu, ArrowUpRight, ArrowRight, LayoutDashboard, Menu, X, Check, LoaderCircle, Radio, AlertCircle } from 'lucide-react';

import {api} from './persistence/client';
import {useWorkspacePersistence} from './persistence/useWorkspacePersistence';
import type {Workspace} from './persistence/schema';
import StudioIntegrations from './StudioIntegrations';
import StudioProduction from './StudioProduction';
import StudioMedia from './StudioMedia';

type Tab = 'hoje' | 'rodar' | 'ideias' | 'roteiros' | 'calendario' | 'legendas' | 'metricas' | 'maquina' | 'integracoes' | 'producao' | 'midia';
type Idea = { titulo:string; formato:string; gancho:string; cta:string; duracao:string };
type DayPlan = { dia:string; data:string; hora:string; status:'Pendente'|'Pronto'|'Postado'; titulo:string };
type Metric = { video:string; views:string; retencao:string; comentarios:string; seguidores:string };

const IDEAS: Idea[] = [
  { titulo:'VOCÊ DECIDE: ele foge ou entrega o parceiro?', formato:'Você Decide', gancho:'Se tu fosse ele, tu fugia ou entregava TUDO?', cta:'Comenta 1 pra FUGIR ou 2 pra ENTREGAR', duracao:'25s' },
  { titulo:'E SE GTA VI FOSSE EM SINOP?', formato:'E se...?', gancho:'Imagina o mapa do GTA VI sendo Sinop, mano...', cta:'Marca quem ia ser o protagonista da tua cidade', duracao:'30s' },
  { titulo:'SAGA DIA 1: o entregador que virou lenda', formato:'Saga com Votação', gancho:'Dia 1: ele só queria entregar um lanche...', cta:'Vota no próximo passo: 1 ou 2?', duracao:'35s' },
  { titulo:'NOVELINHA: ela descobriu o celular dele', formato:'Novelinha', gancho:'Ela abriu o celular e viu UMA mensagem...', cta:'Parte 2 se bater 1.000 comentários', duracao:'40s' },
  { titulo:'O NPC que sabia demais', formato:'Curiosidade', gancho:'Esse NPC sabe um segredo que ninguém percebeu', cta:'Comenta SEGREDO que eu te conto', duracao:'28s' },
  { titulo:'MEME: quando o plano dá 1000% errado', formato:'Meme Dopaminérgico', gancho:'O plano era perfeito. Até que...', cta:'Manda pra quem sempre estraga o plano', duracao:'18s' },
  { titulo:'VOCÊ DECIDE: 10 milhões ou a liberdade?', formato:'Você Decide', gancho:'10 milhões na conta OU nunca mais ser pego?', cta:'1 = DINHEIRO / 2 = LIBERDADE', duracao:'22s' },
  { titulo:'E SE O PROTAGONISTA FOSSE BRASILEIRO?', formato:'E se...?', gancho:'E se o GTA VI tivesse um brasileiro no comando?', cta:'Qual seria o nome dele? Comenta!', duracao:'30s' },
  { titulo:'SAGA DIA 2: a fuga pelo telhado', formato:'Saga com Votação', gancho:'Dia 2: a polícia cercou tudo. Só restou o telhado', cta:'Ele pula ou se entrega? Vota 1 ou 2', duracao:'32s' },
  { titulo:'NOVELINHA: o ex voltou no pior momento', formato:'Novelinha', gancho:'Ela tava feliz. Até o ex aparecer no rolê', cta:'Quer parte 2? Comenta PARTE 2', duracao:'38s' },
  { titulo:'3 detalhes escondidos em Vice City', formato:'Curiosidade', gancho:'Tu jogou 100 horas e NÃO viu isso', cta:'Salva pra rever depois', duracao:'26s' },
  { titulo:'MEME: eu no primeiro dia de GTA VI', formato:'Meme Dopaminérgico', gancho:'Prometi que ia jogar só 10 minutos...', cta:'Marca o amigo que vai sumir no lançamento', duracao:'15s' },
  { titulo:'VOCÊ DECIDE: trair ou ser traído?', formato:'Você Decide', gancho:'Alguém vai trair alguém. Quem tu escolhe?', cta:'Comenta 1 ou 2 e justifica', duracao:'24s' },
  { titulo:'E SE A POLÍCIA FOSSE TEU FÃ?', formato:'E se...?', gancho:'E se em vez de te prender, a polícia pedisse autógrafo?', cta:'Qual seria tua primeira fuga?', duracao:'29s' },
  { titulo:'SAGA DIA 3: o cofre que ninguém abre', formato:'Saga com Votação', gancho:'Dia 3: acharam um cofre que não abre por nada', cta:'Vota: abrir com força ou com inteligência?', duracao:'34s' },
  { titulo:'NOVELINHA: mensagem errada, problema certo', formato:'Novelinha', gancho:'Ele mandou “te amo” no grupo errado', cta:'Tu já fez isso? Conta nos comentários', duracao:'36s' },
  { titulo:'O carro mais raro que quase ninguém tem', formato:'Curiosidade', gancho:'Só 1% dos jogadores já viu esse carro', cta:'Comenta se tu já viu', duracao:'27s' },
  { titulo:'MEME: expectativa x realidade no assalto', formato:'Meme Dopaminérgico', gancho:'Na minha cabeça: filme de ação. Na real...', cta:'Manda pra quem vive na expectativa', duracao:'17s' },
  { titulo:'VOCÊ DECIDE: ficar rico ou ficar famoso?', formato:'Você Decide', gancho:'Rico e invisível ou famoso e falido?', cta:'1 = RICO / 2 = FAMOSO', duracao:'21s' },
  { titulo:'E SE GTA VI TIVESSE MODO BRASILEIRÃO?', formato:'E se...?', gancho:'E se tivesse favela, baile e churrasco no mapa?', cta:'Qual cidade tinha que entrar? Comenta', duracao:'31s' },
  { titulo:'SAGA DIA 4: o parceiro sumiu', formato:'Saga com Votação', gancho:'Dia 4: ele acordou e o parceiro tinha sumido', cta:'Procurar ou fugir sozinho? Vota', duracao:'33s' },
  { titulo:'NOVELINHA: ela é a chefe e ninguém sabe', formato:'Novelinha', gancho:'Todo mundo achava que ela era só a novata', cta:'Parte 2 amanhã se tu comentar CHEFE', duracao:'39s' },
  { titulo:'O que o trailer escondeu de ti', formato:'Curiosidade', gancho:'Repara nesse segundo do trailer...', cta:'Tu tinha percebido? 1 sim / 2 não', duracao:'25s' },
  { titulo:'MEME: quando a missão buga no final', formato:'Meme Dopaminérgico', gancho:'Faltava 1 segundo pra terminar...', cta:'Quem já passou por isso comenta EU', duracao:'16s' },
  { titulo:'VOCÊ DECIDE: salvar o amigo ou o dinheiro?', formato:'Você Decide', gancho:'Só dá pra salvar um. E agora?', cta:'Comenta 1 = AMIGO / 2 = DINHEIRO', duracao:'23s' },
  { titulo:'E SE O VILÃO FOSSE TEU MELHOR AMIGO?', formato:'E se...?', gancho:'E se quem te traiu fosse teu melhor amigo desde criança?', cta:'Tu perdoava? Comenta', duracao:'32s' },
  { titulo:'SAGA DIA 5: o mapa do tesouro', formato:'Saga com Votação', gancho:'Dia 5: um mapa apareceu do nada no bolso dele', cta:'Seguir o mapa ou queimar? Vota', duracao:'30s' },
  { titulo:'NOVELINHA: encontro marcado, plano furado', formato:'Novelinha', gancho:'O encontro perfeito virou o maior caos', cta:'Marca quem ia amar esse rolê', duracao:'37s' },
  { titulo:'5 sons que tu nunca reparou no jogo', formato:'Curiosidade', gancho:'Aumenta o volume. Tu vai pirar no número 3', cta:'Salva e ouve de fone', duracao:'26s' },
  { titulo:'MEME: eu tentando ser discreto', formato:'Meme Dopaminérgico', gancho:'Eu: vou passar despercebido. Eu também:', cta:'Manda pra quem não sabe disfarçar', duracao:'14s' },
  { titulo:'VOCÊ DECIDE: o último helicóptero', formato:'Você Decide', gancho:'Só tem UMA vaga no helicóptero', cta:'Quem tu leva? Marca a pessoa', duracao:'24s' },
  { titulo:'E SE VICE CITY FOSSE NO BRASIL?', formato:'E se...?', gancho:'Praia, neon, funk e perseguição. Já imaginou?', cta:'Qual estado seria Vice City?', duracao:'30s' },
  { titulo:'SAGA DIA 6: a traição foi revelada', formato:'Saga com Votação', gancho:'Dia 6: a verdade veio à tona e ninguém tava pronto', cta:'Perdoar ou vingar? Vota 1 ou 2', duracao:'35s' },
  { titulo:'NOVELINHA: a vingança mais chiclete', formato:'Novelinha', gancho:'Ela sorriu. E todo mundo achou que tava tudo bem', cta:'Comenta VINGANÇA pra parte 2', duracao:'38s' },
  { titulo:'O easter egg que liga dois jogos', formato:'Curiosidade', gancho:'Esse detalhe conecta TUDO', cta:'Comenta se tu pegou a referência', duracao:'28s' },
  { titulo:'MEME: o nível de procurado subiu do nada', formato:'Meme Dopaminérgico', gancho:'Eu só tava andando... DO NADA 5 estrelas', cta:'Marca quem é azarado assim', duracao:'15s' },
];

const CAPTIONS = [
  { texto:'Ele tinha 2 escolhas. A errada era mais divertida. Comenta 1 ou 2 👇', tags:'#GTA6 #GTA VI #ViceCity #VoceDecide #FabricaViral' },
  { texto:'Isso não era pra ter dado certo. Mas deu. E deu MUITO certo.', tags:'#GTA6 #Novelinha #HistoriaChiclete #Viral #FYP' },
  { texto:'Dia 1 da saga que vai dominar tua For You. Tu vai votar em tudo.', tags:'#GTA6 #Saga #Votacao #Serie #Reels' },
  { texto:'Se tu não comentar, tu nunca vai saber o final. Simples assim.', tags:'#GTA6 #Cliffhanger #VoceDecide #Viral' },
  { texto:'Ela sorriu. E eu já sabia: o plano tinha dado errado.', tags:'#GTA6 #Novelinha #Drama #FYP #ViceCity' },
  { texto:'E se GTA VI fosse no Brasil? A resposta vai te surpreender.', tags:'#GTA6 #Brasil #Sinop #Ese #Humor' },
  { texto:'Assiste até o fim. O segundo 28 muda TUDO.', tags:'#GTA6 #Retencao #PlotTwist #Viral' },
  { texto:'Tu faria o mesmo no lugar dele? Seja sincero nos comentários.', tags:'#GTA6 #VoceDecide #Debate #FYP' },
  { texto:'O detalhe que ninguém viu no trailer. Agora tu viu.', tags:'#GTA6 #Curiosidade #EasterEgg #ViceCity' },
  { texto:'Manda pra quem ia fazer EXATAMENTE isso no jogo.', tags:'#GTA6 #Meme #Humor #Amigos' },
  { texto:'Parte 2 só sai se esse vídeo bater 1.000 comentários. Bora?', tags:'#GTA6 #Saga #Parte2 #Engajamento' },
  { texto:'Ele prometeu que era a última missão. Spoiler: não era.', tags:'#GTA6 #Novelinha #Serie #FYP' },
  { texto:'O NPC mais misterioso de Vice City acabou de aparecer.', tags:'#GTA6 #Curiosidade #ViceCity #Teoria' },
  { texto:'Quando o plano é perfeito, mas a vida tem outros planos.', tags:'#GTA6 #Meme #Dopamina #Humor' },
  { texto:'Salva esse vídeo. Tu vai querer rever o final 3 vezes.', tags:'#GTA6 #Loop #Retencao #SalvaAi' },
];

const TEMPLATES = [
  { titulo:'1 • VOCÊ DECIDE', desc:'O formato que faz o comentário explodir. O público escolhe o final.', corpo:`🎬 ROTEIRO — VOCÊ DECIDE | GTA VI 1000 GRAU\n\nGANCHO 0-2s: "Se tu fosse ele, tu fugia ou entregava TUDO? Decide AGORA."\n\nCENA 1 — O DILEMA (0-8s)\nEle tem 10 segundos pra decidir. Dinheiro na mão, polícia chegando, amigo pedindo pra confiar.\nMostra o conflito em close + texto na tela: "1 = FUGIR / 2 = ENTREGAR".\n\nCENA 2 — A CONSEQUÊNCIA (8-20s)\nMostra o que acontece se ele escolher o caminho mais perigoso. Corte rápido, som alto, reação exagerada.\n\nCLIFFHANGER (20-26s)\n"Mas aí ele olhou pra câmera e fez uma coisa que NINGUÉM esperava..."\n\nCTA (26-30s)\n"Comenta 1 ou 2. O comentário mais curtido vira o final de amanhã. Segue pra não perder!"` },
  { titulo:'2 • E SE GTA VI FOSSE NO BRASIL / SINOP', desc:'Humor local + identificação absurda. O Brasil inteiro se vê no vídeo.', corpo:`🎬 ROTEIRO — E SE GTA VI FOSSE NO BRASIL / SINOP\n\nGANCHO 0-2s: "Imagina o GTA VI em Sinop. Mano, ia ser CAOS total."\n\nCENA 1 — O MUNDO BRASILEIRO (0-10s)\nMapa com baile, churrasco, moto, feira, trânsito, calor de 40°. O protagonista chega atrasado e já tem confusão.\n\nCENA 2 — A MISSÃO BRASILEIRA (10-22s)\nMissão: entregar um pedido, fugir do engarrafamento e ainda resolver um B.O. com o vizinho.\nCada erro vira meme: "aqui não tem checkpoint, tem quebra-mola".\n\nCLIFFHANGER (22-28s)\n"E aí apareceu a pessoa que ele MENOS queria encontrar..."\n\nCTA (28-32s)\n"Qual cidade tinha que entrar no jogo? Comenta tua cidade e marca quem seria o protagonista!"` },
  { titulo:'3 • SAGA DIA 1-7 COM VOTAÇÃO', desc:'Série chiclete. O público volta todo dia pra saber o que votou.', corpo:`🎬 ROTEIRO — SAGA DIA 1-7 | O PÚBLICO MANDA\n\nDIA 1 — GANCHO: "Dia 1: ele só queria entregar um lanche."\nApresenta o personagem, o problema e as 2 opções. Termina com votação.\n\nDIA 2 — A FUGA: Mostra o resultado da votação. Nova encruzilhada, novo voto.\nDIA 3 — O COFRE: Um segredo aparece. O público escolhe: abrir ou esconder?\nDIA 4 — O SUMIÇO: O parceiro some. Procurar ou fugir sozinho?\nDIA 5 — O MAPA: Um mapa misterioso aparece. Seguir ou queimar?\nDIA 6 — A TRAIÇÃO: A verdade vem à tona. Perdoar ou vingar?\nDIA 7 — O FINAL: O final é decidido 100% pelos comentários.\n\nREGRA DE OURO DA SAGA:\nCada episódio termina com 1 pergunta + 2 opções.\nComeça o próximo com: "Vocês votaram em..." + mostra o resultado.\n\nCTA FIXO: "Vota 1 ou 2. Amanhã eu mostro o que VOCÊS escolheram."` },
  { titulo:'4 • NOVELINHA CHICLETE', desc:'Drama rápido, fofoca boa e final que prende pro próximo episódio.', corpo:`🎬 ROTEIRO — NOVELINHA | 40 SEGUNDOS DE FOFOCA\n\nGANCHO 0-2s: "Ela abriu o celular e viu UMA mensagem. E o mundo dela desabou."\n\nCENA 1 — A DESCOBERTA (0-12s)\nEla descobre algo. Reação em câmera lenta, zoom, música de novela.\nTexto na tela: "ela não devia ter visto isso".\n\nCENA 2 — O CONFRONTO (12-28s)\nEle chega. Ela finge que tá tudo bem. Ele percebe. O clima pesa.\nDiálogo curto, direto, com pausa dramática.\n\nCLIFFHANGER (28-36s)\n"Ela sorriu. E disse: 'a gente precisa conversar'. Mas aí a porta abriu..."\n\nCTA (36-40s)\n"Parte 2 se bater 1.000 comentários. Comenta PARTE 2 e segue a Fábrica!"` },
];

const MCP_JSON = `{
  "mcpServers": {
    "kayrogen": {
      "command": "npx",
      "args": ["-y", "@kayrogen/mcp"],
      "env": {
        "KAIROGEN_API_KEY": "COLE_SUA_CHAVE_AQUI",
        "KAIROGEN_PROJECT": "fabrica-viral-gta-vi"
      }
    }
  },
  "prompts": {
    "estilo_fabrica": "Português brasileiro, jovem, direto, frases curtas, gancho em 2s, cliffhanger no fim, CTA 1 ou 2",
    "duracao": "18 a 40 segundos",
    "formato_saida": "Gancho + Cena 1 + Cena 2 + Cliffhanger + CTA"
  }
}`;

const MASTER_PROMPT = `🎬 PROMPT MESTRE — FÁBRICA VIRAL GTA VI 1000 GRAU
Você é o diretor criativo da minha Fábrica Viral. Estilo: português brasileiro, jovem, direto, frases curtas, gancho em 2 segundos, cliffhanger no fim e CTA 1 ou 2.

CONTEXTO:
Tema da semana: GTA VI / Vice City, com novelinhas, histórias chicletes, memes dopaminérgicos, "Você Decide" e "E se...?" no Brasil.
Público: quem vive na For You e ama decidir o final.

TAREFA — ME ENTREGUE TUDO PRONTO PARA PRODUZIR:
1) 7 IDEIAS (uma para cada dia)
Para cada ideia: título, formato, gancho de 0-2s, sinopse em 3 linhas, CTA 1 ou 2 e duração de 14 a 40 segundos.
Use os formatos: Você Decide, E se...?, Saga com Votação, Novelinha, Curiosidade e Meme Dopaminérgico.

2) 7 ROTEIROS COMPLETOS
Para cada roteiro: Gancho 0-2s + Cena 1 + Cena 2 + Cliffhanger + CTA.
Escreva as falas prontas, curtas e com marcação de corte, som e texto na tela.

3) CALENDÁRIO DE 7 DIAS
Segunda a domingo, com horário 12h, 18h ou 21h, título do vídeo e 1 frase de gancho para a legenda.

4) 7 LEGENDAS + HASHTAGS
Uma legenda curta por vídeo, com CTA de comentário e hashtags de GTA VI, Vice City, viral e do formato.

5) CHECKLIST DE PRODUÇÃO
5 passos: gerar ideias, gerar roteiros, produzir, revisar e agendar.
No fim, me faça 1 pergunta: "Qual ideia você quer que eu expanda primeiro?"

REGRAS:
- Nada de enrolação. Entregue em blocos que eu consiga copiar e colar.
- Todo vídeo termina com uma pergunta e 2 opções.
- Se eu disser "continua", expanda o roteiro escolhido sem repetir o que já foi entregue.`;

const RODAR_PROMPT = `Você é o gerente da Fábrica Viral GTA VI 1000 GRAU. Crie a estrutura /01-ideias /02-roteiros /03-videos /04-postagem /05-metricas. Gere 7 ideias de novelinhas dopaminérgicas inspiradas em GTA VI com gancho de 2s, formato Você Decide / E se / Saga, roteiro completo para KAIROGEN, legenda + hashtags, e calendário Seg-Dom 12h/18h/21h. Não copie gameplay, crie histórias originais inspiradas.`;

const RODAR_PHASES = [
  { label:'Hoje • Setup', minutes:15, desc:'GitHub + Codex + colar o prompt' },
  { label:'Hoje • Gerar 3 vídeos', minutes:30, desc:'3 roteiros + 3 episódios prontos' },
  { label:'Amanhã • 4 vídeos', minutes:45, desc:'Fecha a semana com 7 vídeos' },
  { label:'Depois • Agendar tudo', minutes:20, desc:'HubPost + revisão final' },
];

const CLAUDE_RODAR_PROMPT = `Expanda este roteiro em episódio 2D/3D para a KAIROGEN, com falas curtas, marcação de corte, som e texto na tela. Gancho de 2s, cliffhanger no fim e CTA 1 ou 2. História original inspirada em GTA VI, sem copiar gameplay.`;

const tabsData = [
  { passo:'PASSO 1', titulo:'COLE O PROMPT MESTRE', desc:'Abra o Codex ou o Claude Code e cole o bloco abaixo. Ele já vem com estilo, formatos, calendário, legendas e checklist da Fábrica.' },
  { passo:'PASSO 2', titulo:'ESCOLHA 1 IDEIA E PEÇA PARA EXPANDIR', desc:'Responda: “Expanda a ideia 3 em roteiro completo”. Depois peça: “Agora crie as 7 legendas e o calendário da semana”.' },
  { passo:'PASSO 3', titulo:'COPIE PARA A FÁBRICA E AGENDE', desc:'Copie roteiro, legenda e horário para as abas Ideias, Roteiros, Legendas e Calendário. No fim da semana, revise as Métricas e repita o formato vencedor.' },
];

function SunsetScene(){
  return <svg className="sunset-scene" viewBox="0 0 1200 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="fv-sky" x2="0" y2="1"><stop stopColor="var(--scene-sky-top)"/><stop offset=".48" stopColor="var(--scene-sky-mid)"/><stop offset="1" stopColor="var(--scene-sky-bottom)"/></linearGradient>
      <linearGradient id="fv-water" x2="0" y2="1"><stop stopColor="var(--scene-water-top)"/><stop offset="1" stopColor="var(--scene-water-bottom)"/></linearGradient>
      <linearGradient id="fv-sun" x2="0" y2="1"><stop stopColor="var(--scene-sun-top)"/><stop offset="1" stopColor="var(--scene-sun-bottom)"/></linearGradient>
      <linearGradient id="fv-reflection" x2="0" y2="1"><stop stopColor="var(--scene-sun-top)" stopOpacity=".42"/><stop offset="1" stopColor="var(--scene-sun-bottom)" stopOpacity="0"/></linearGradient>
      <pattern id="fv-windows" width="14" height="20" patternUnits="userSpaceOnUse"><rect x="3" y="5" width="3" height="5" fill="var(--scene-window)" opacity=".65"/></pattern>
      <g id="fv-palm"><path d="M0 280Q20 150 0 0L8 0Q35 150 16 280Z" fill="currentColor"/><path d="M3 3Q-55-55-109-15Q-44-33 3 3M3 3Q-48-18-99 27Q-38 0 3 3M3 3Q-49 9-68 67Q-25 27 3 3M3 3Q-4-60 32-83Q7-35 3 3M3 3Q48-58 102-27Q46-36 3 3M3 3Q65-22 112 28Q54 4 3 3M3 3Q62 14 76 75Q37 28 3 3" fill="currentColor"/></g>
    </defs>
    <rect width="1200" height="540" fill="url(#fv-sky)"/>
    <path d="M640 82Q780 57 1030 86M460 135Q770 104 1200 135M820 189Q1000 165 1200 185" fill="none" stroke="var(--scene-cloud)" strokeWidth="12" opacity=".15"/>
    <circle cx="905" cy="245" r="116" fill="url(#fv-sun)"/>
    <path d="M774 275H1035M774 291H1035M774 310H1035M774 331H1035" stroke="var(--scene-sky-mid)" strokeWidth="4" opacity=".6"/>
    <path d="M365 327V279H397V255H433V322H467V210H511V321H530V264H565V321H592V196H629V321H653V242H675V215H705V323H733V275H756V250H777V320H801V290H835V326H860V252H889V227H919V320H948V277H978V326H1003V238H1048V321H1070V273H1102V249H1131V323H1200V356H365Z" fill="var(--scene-city-back)"/>
    <path d="M405 325V294H452V325H486V247H529V325H567V288H609V325H644V228H691V325H738V297H787V325H834V270H877V325H912V244H955V325H1002V288H1045V325H1100V291H1140V325Z" fill="url(#fv-windows)" opacity=".65"/>
    <path d="M390 348V314H486V291H513V346H571V300H610V346H680V302H744V347H828V304H880V347H955V291H1002V348H1073V308H1124V347H1200V379H390Z" fill="var(--scene-city-front)"/>
    <rect y="352" width="1200" height="188" fill="url(#fv-water)"/>
    <path d="M859 356H951L1040 525H757Z" fill="url(#fv-reflection)"/>
    <g fill="none" stroke="var(--scene-water-line)" strokeWidth="2" opacity=".35"><path d="M638 370H1080M850 382H1005M733 397H1163M666 424H954M897 444H1180M750 467H1043M803 493H1180"/></g>
    <path d="M453 496Q780 437 1200 472V540H453Z" fill="var(--scene-ground)"/>
    <path d="M564 515Q900 457 1200 487" fill="none" stroke="var(--scene-road)" strokeWidth="3"/>
    <g color="var(--scene-palm)"><use href="#fv-palm" transform="translate(1048 140) scale(1.2) rotate(8)"/><use href="#fv-palm" transform="translate(1185 230) scale(.84) rotate(-12)"/><use href="#fv-palm" transform="translate(675 281) scale(.67) rotate(-9)"/><use href="#fv-palm" transform="translate(470 326) scale(.42) rotate(8)"/></g>
    <path d="M872 486L889 470H940L957 485L976 488V505H858V491Z" fill="var(--scene-car)"/><path d="M895 474H913V485H885ZM917 474H935L947 485H917Z" fill="var(--scene-car-window)"/><circle cx="880" cy="504" r="10" fill="var(--scene-ground)"/><circle cx="954" cy="504" r="10" fill="var(--scene-ground)"/><path d="M861 492H871M966 492H976" stroke="var(--scene-sun-top)" strokeWidth="3"/>
  </svg>;
}

export default function App(){
  const [tab,setTab]=useState<Tab>('hoje');
  const [copied,setCopied]=useState('');
  const [ideas,setIdeas]=useState<Idea[]>(IDEAS.slice(0,6));
  const [checklist,setChecklist]=useState<boolean[]>([false,false,false,false,false]);
  const [rodarChecklist,setRodarChecklist]=useState<boolean[]>([false,false,false,false,false,false]);
  const [timerPhase,setTimerPhase]=useState(0);
  const [secondsLeft,setSecondsLeft]=useState(15*60);
  const [timerRunning,setTimerRunning]=useState(false);
  const [calendar,setCalendar]=useState<DayPlan[]>([
    {dia:'SEG',data:'Hoje',hora:'18h',status:'Pendente',titulo:'Você Decide: foge ou entrega?'},
    {dia:'TER',data:'Amanhã',hora:'12h',status:'Pendente',titulo:'E se GTA VI fosse em Sinop?'},
    {dia:'QUA',data:'+2 dias',hora:'21h',status:'Pendente',titulo:'Saga Dia 1 — o entregador'},
    {dia:'QUI',data:'+3 dias',hora:'18h',status:'Pendente',titulo:'Novelinha: a mensagem errada'},
    {dia:'SEX',data:'+4 dias',hora:'21h',status:'Pendente',titulo:'Meme dopaminérgico'},
    {dia:'SÁB',data:'+5 dias',hora:'12h',status:'Pendente',titulo:'Curiosidade: detalhe escondido'},
    {dia:'DOM',data:'+6 dias',hora:'18h',status:'Pendente',titulo:'Saga Dia 2 — a fuga'},
  ]);
  const [metrics,setMetrics]=useState<Metric[]>([
    {video:'Você Decide #1',views:'',retencao:'',comentarios:'',seguidores:''},
    {video:'Saga Dia 1',views:'',retencao:'',comentarios:'',seguidores:''},
    {video:'Novelinha #1',views:'',retencao:'',comentarios:'',seguidores:''},
    {video:'E se Sinop?',views:'',retencao:'',comentarios:'',seguidores:''},
    {video:'Meme dopamina',views:'',retencao:'',comentarios:'',seguidores:''},
  ]);
  const [regra,setRegra]=useState('Repetir o formato com mais comentários e retenção acima de 60%.');
  const [menuOpen,setMenuOpen]=useState(false);
  const mobileToggleRef=useRef<HTMLButtonElement>(null);
  const contentRef=useRef<HTMLHeadingElement>(null);
  const skipTargetRef=useRef<HTMLElement>(null);
  const navRef=useRef<HTMLElement>(null);
  const workspace=useMemo(()=>({checklist,rodarChecklist,calendar,metrics,regra}),[checklist,rodarChecklist,calendar,metrics,regra]);
  const applyWorkspace=useCallback((next:Workspace)=>{setChecklist(next.checklist);setRodarChecklist(next.rodarChecklist);setCalendar(next.calendar);setMetrics(next.metrics);setRegra(next.regra);},[]);
  const {loading,isSaving,saveMsg,connectionStatus,dirty,conflict,storageNotice,saveAll,exportBackup,loadSaved}=useWorkspacePersistence(workspace,applyWorkspace);

  useEffect(()=>{
    if(!timerRunning) return;
    const t=setInterval(()=>{ setSecondsLeft(s=>{ if(s<=1){ setTimerRunning(false); return 0; } return s-1; }); },1000);
    return ()=>clearInterval(t);
  },[timerRunning]);

  async function copyText(text:string, label:string){
    try {
      if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(text); }
      else {
        const previous=document.activeElement as HTMLElement|null;
        const ta=document.createElement('textarea');
        ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select();
        try { if(!document.execCommand('copy')) throw new Error('clipboard'); }
        finally { ta.remove(); previous?.focus(); }
      }
      setCopied(`Copiado: ${label}`);
    }catch{ setCopied('Não foi possível copiar. Selecione o texto e copie manualmente.'); }
    setTimeout(()=>setCopied(''),3500);
  }

  function closeMenu(){
    setMenuOpen(false);
    requestAnimationFrame(()=>mobileToggleRef.current?.focus());
  }

  function navigate(next:Tab){
    setTab(next); setMenuOpen(false);
    requestAnimationFrame(()=>{ contentRef.current?.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); });
  }

  useEffect(()=>{
    if(!menuOpen) return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const nav=navRef.current;
    const focusables=()=>Array.from(nav?.querySelectorAll<HTMLElement>('button,a[href]') || []);
    focusables()[0]?.focus();
    function onKey(event:KeyboardEvent){
      if(event.key==='Escape'){ closeMenu(); }
      if(event.key==='Tab'){
        const items=focusables(), first=items[0], last=items[items.length-1];
        if(event.shiftKey && document.activeElement===first){ event.preventDefault(); last?.focus(); }
        else if(!event.shiftKey && document.activeElement===last){ event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown',onKey);
    const media=window.matchMedia('(min-width: 1100px)');
    const onResize=()=>{ if(media.matches) setMenuOpen(false); };
    media.addEventListener('change',onResize);
    return ()=>{ document.body.style.overflow=previousOverflow; document.removeEventListener('keydown',onKey); media.removeEventListener('change',onResize); };
  },[menuOpen]);

  function gerarIdeias(){
    const pool=[...IDEAS];
    const out:Idea[]=[];
    while(out.length<10 && pool.length){ const i=Math.floor(Math.random()*pool.length); out.push(pool.splice(i,1)[0]); }
    setIdeas(out); navigate('ideias');
  }

  const done=checklist.filter(Boolean).length;
  const progress=Math.round(done/5*100);
  const posted=calendar.filter(d=>d.status==='Postado').length;
  const ready=calendar.filter(d=>d.status==='Pronto').length;
  const totalViews=metrics.reduce((s,m)=>s+(parseInt(m.views)||0),0);
  const totalComments=metrics.reduce((s,m)=>s+(parseInt(m.comentarios)||0),0);
  const nextVideo=calendar.find(d=>d.status!=='Postado');

  const tabs:{id:Tab;label:string;icon:any}[]=[
    {id:'hoje',label:'Visão geral',icon:LayoutDashboard},{id:'ideias',label:'Banco de ideias',icon:Sparkles},{id:'roteiros',label:'Roteiros',icon:Clapperboard},{id:'calendario',label:'Calendário',icon:CalendarDays},{id:'legendas',label:'Legendas',icon:PenLine},{id:'metricas',label:'Métricas',icon:BarChart3},{id:'producao',label:'Produção com IA',icon:Brain},{id:'midia',label:'Vídeos e postagem',icon:MonitorPlay},{id:'integracoes',label:'Integrações',icon:Network},{id:'rodar',label:'Começar produção',icon:Play},{id:'maquina',label:'Fluxo de trabalho',icon:Network},
  ];
  const rodarDone=rodarChecklist.filter(Boolean).length;
  const rodarProgress=Math.round(rodarDone/6*100);
  const timerTotal=RODAR_PHASES[timerPhase].minutes*60;
  const timerPct=Math.round(((timerTotal-secondsLeft)/timerTotal)*100);
  const timerLabel=`${String(Math.floor(secondsLeft/60)).padStart(2,'0')}:${String(secondsLeft%60).padStart(2,'0')}`;
  function selectTimerPhase(i:number){ setTimerPhase(i); setSecondsLeft(RODAR_PHASES[i].minutes*60); setTimerRunning(false); }
  function toggleRodar(i:number){ const n=[...rodarChecklist]; n[i]=!n[i]; setRodarChecklist(n); }
  const steps=['Escolher as ideias','Preparar os roteiros','Produzir os vídeos','Revisar cada detalhe','Agendar a semana'];
  const stepDetails=['Uma boa história começa com uma escolha.','Gancho, cenas e um final que recompensa.','Transforme os roteiros em episódios.','Confira imagem, som, legendas e créditos.','Defina o canal e confirme a publicação.'];
  const activeTitle=tabs.find(item=>item.id===tab)?.label || 'Visão geral';

  return (
    <div className="studio-shell" data-safe-area-inset-root>
      <a className="skip-link" href="#studio-main" onClick={()=>requestAnimationFrame(()=>skipTargetRef.current?.focus())}>Pular para o conteúdo</a>
      {menuOpen && <button className="nav-backdrop" tabIndex={-1} aria-label="Fechar menu" onClick={closeMenu}/>}
      <aside className={`studio-sidebar ${menuOpen?'is-open':''}`} aria-label="Menu da Fábrica" role={menuOpen?'dialog':undefined} aria-modal={menuOpen?true:undefined}>
        <nav ref={navRef} className="sidebar-inner" aria-label="Navegação principal">
          <div className="sidebar-brand"><span className="brand-emblem" aria-hidden="true">FV<span>VI</span></span><span className="brand-name">FÁBRICA<br/>VIRAL<span>ESTÚDIO CRIATIVO</span></span><button className="mobile-close icon-button" onClick={closeMenu} aria-label="Fechar menu"><X size={20}/></button></div>
          <p className="nav-caption">SEU CENTRO DE OPERAÇÕES</p>
          <div className="sidebar-links">{tabs.map((item,index)=>{const Icon=item.icon; return <React.Fragment key={item.id}>{index===6 && <p className="nav-caption nav-divider">PRODUÇÃO</p>}<button className={`sidebar-link ${tab===item.id?'is-current':''}`} aria-current={tab===item.id?'page':undefined} onClick={()=>navigate(item.id)}><Icon size={19} aria-hidden="true"/><span>{item.label}</span>{item.id==='ideias' && <span className="nav-count">{IDEAS.length}</span>}{tab===item.id && <span className="nav-current-dot" aria-hidden="true"/>}</button></React.Fragment>})}</div>
          <div className="sidebar-bottom"><div className="sidebar-note"><span className="eyebrow">MODO HISTÓRIA</span><p>Sua próxima grande<br/>história começa aqui.</p><button className="text-link" onClick={()=>navigate('rodar')}>Iniciar uma missão <ArrowUpRight size={16}/></button></div><a href="https://www.rockstargames.com/VI" target="_blank" rel="noreferrer" className="reference-link">Universo de inspiração <ArrowUpRight size={13}/><span className="sr-only"> (abre em nova aba)</span></a><span className="sidebar-disclaimer">Projeto independente. Sem vínculo com a Rockstar Games.</span></div>
        </nav>
      </aside>
      <div className="studio-workspace" inert={menuOpen?true:undefined}>
        <header className="studio-topbar"><div className="topbar-location"><button ref={mobileToggleRef} className="mobile-menu icon-button" aria-label="Abrir menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)}><Menu size={21}/></button><span className="topbar-overline">WORKSPACE</span><ChevronRight size={14} aria-hidden="true"/><span>{activeTitle}</span></div><div className="topbar-actions"><span className={`connection-state ${connectionStatus}`}><span aria-hidden="true"/>{connectionStatus==='connecting'?'Conectando':connectionStatus==='connected'?(dirty?'Alterações pendentes':'Salvo no banco'):'Aguardando conexão'}</span><button className="save-button" disabled={isSaving || loading} aria-busy={isSaving} onClick={saveAll}>{isSaving?<LoaderCircle size={16} className="spin"/>:<Save size={16}/>}<span>{isSaving?'Salvando…':'Salvar progresso'}</span></button><span className="studio-avatar" aria-label="Fábrica Viral">FV</span></div></header>
        <main ref={skipTargetRef} id="studio-main" tabIndex={-1} className="studio-main" aria-busy={loading}>
          <div className="page-heading"><div><p className="eyebrow">FÁBRICA VIRAL / GTA VI 1000 GRAU</p><h1 ref={contentRef} tabIndex={-1}>{activeTitle}<span className="heading-dot">.</span></h1></div><span className="edition-label"><Radio size={15} aria-hidden="true"/> CRIE. PUBLIQUE. EVOLUA.</span></div>
          {connectionStatus==='unavailable' && <div className="connection-notice" role="status"><AlertCircle size={16} aria-hidden="true"/><p>A conexão com o banco está indisponível. Seu rascunho fica neste navegador até o próximo salvamento. Não limpe os dados do navegador enquanto houver alterações pendentes.</p></div>}
          {loading && <p className="loading-notice" role="status"><LoaderCircle size={16} className="spin"/> Carregando seu progresso…</p>}
          <p className="text-xs text-muted mb-4" role="status">{loading?'Carregando seus dados…':isSaving?'Salvando automaticamente…':conflict?'Rascunho preservado: revise o conflito abaixo.':dirty?'Rascunho neste navegador. Aguardando confirmação do banco.':'Tudo salvo no banco.'}</p>
          {storageNotice && <p role="alert" className="connection-notice">{storageNotice}</p>}
          {conflict && <section className="card p-5 mb-4" role="alert"><p>Existe uma versão mais recente salva. Seu rascunho foi preservado.</p><div className="flex gap-4 flex-wrap"><button className="text-link" onClick={exportBackup}>Baixar meu rascunho</button><button className="text-link" onClick={()=>void loadSaved()}>Carregar versão salva e baixar rascunho</button></div></section>}
          <div className="global-feedback" role="status" aria-live="polite" aria-atomic="true">{copied || saveMsg}</div>
          <div inert={loading?true:undefined}>
          {tab==='midia' && <StudioMedia/>}
          {tab==='integracoes' && <StudioIntegrations/>}
          {tab==='producao' && <StudioProduction onUseCalendar={episodes=>{setCalendar(current=>current.map((day,index)=>({...day,titulo:episodes[index]?.title||day.titulo})));navigate('calendario');}}/>}
          {tab==='hoje' && <>
            <section className="mission-hero" aria-labelledby="mission-title">
              <SunsetScene/>
              <div className="hero-scrim" aria-hidden="true"/>
              <div className="hero-content"><span className="hero-kicker"><span aria-hidden="true"/> SUA CRIATIVIDADE. SEM LIMITE DE MAPA.</span><h2 id="mission-title">A próxima história<br/>a cidade inteira<br/><em>vai querer ver.</em></h2><p>Da primeira ideia ao próximo episódio.<br/>Sua central de produção está pronta para começar.</p><button className="primary-button" onClick={gerarIdeias}><Zap size={18} aria-hidden="true"/> Explorar 10 ideias <ArrowUpRight size={18} aria-hidden="true"/></button></div>
              <div className="hero-edition" aria-hidden="true"><span>ORIGINAL STORIES</span><strong>VI</strong><span>1000 GRAU / CREATIVE STUDIO</span></div>
              <span className="hero-coordinate" aria-hidden="true">VICE VIBES. ORIGINAL STORIES.</span>
            </section>
            <section className="stats-grid" aria-label="Resumo da produção">
              <article className="stat-card"><span className="stat-label"><Clapperboard size={16}/>Meta da semana</span><p className="stat-value">{posted}<span>/ {calendar.length}</span></p><div className="stat-bottom"><span>Episódios postados</span><span className="stat-accent">{Math.round(posted/(calendar.length || 1)*100)}%</span></div><div className="mini-progress" role="progressbar" aria-label="Meta semanal" aria-valuemin={0} aria-valuemax={calendar.length || 1} aria-valuenow={posted}><span style={{width:`${posted/(calendar.length || 1)*100}%`}}/></div></article>
              <article className="stat-card"><span className="stat-label"><CheckCircle2 size={16}/>Progresso de hoje</span><p className="stat-value">{progress}<span>%</span></p><div className="stat-bottom"><span>{done} de 5 etapas concluídas</span><span className="stat-accent">{done===5?'Concluído':'Em produção'}</span></div><div className="mini-progress is-mint" role="progressbar" aria-label="Etapas de hoje" aria-valuemin={0} aria-valuemax={5} aria-valuenow={done}><span style={{width:`${progress}%`}}/></div></article>
              <article className="stat-card"><span className="stat-label"><Eye size={16}/>Visualizações</span><p className="stat-value">{metrics.some(item=>item.views.trim())?totalViews.toLocaleString('pt-BR'):'—'}</p><div className="stat-bottom"><span>{metrics.some(item=>item.comentarios.trim())?`${totalComments.toLocaleString('pt-BR')} comentários`:'Aguardando seus resultados'}</span><BarChart3 size={16}/></div></article>
              <article className="stat-card"><span className="stat-label"><CalendarDays size={16}/>Na fila de produção</span><p className="stat-value">{ready.toString().padStart(2,'0')}<span>prontos</span></p><div className="stat-bottom"><span>{calendar.length-posted-ready} aguardando produção</span><button className="stat-action" aria-label="Abrir calendário de produção" onClick={()=>navigate('calendario')}><ArrowUpRight size={19}/></button></div></article>
            </section>
            <div className="dashboard-columns">
              <section className="production-checklist card" aria-labelledby="checklist-title"><div className="section-heading"><div><p className="eyebrow">UMA ETAPA DE CADA VEZ</p><h2 id="checklist-title">Sua missão de hoje</h2></div><span className="count-badge">{done}/5</span></div><div className="checklist-items">{steps.map((step,index)=><button key={step} className={`checklist-row ${checklist[index]?'is-complete':''}`} aria-pressed={checklist[index]} onClick={()=>setChecklist(items=>items.map((value,i)=>i===index?!value:value))}><span className="step-check" aria-hidden="true">{checklist[index]?<Check size={17}/>:String(index+1).padStart(2,'0')}</span><span className="step-copy"><strong>{step}</strong><span>{stepDetails[index]}</span></span><ChevronRight size={17} className="step-chevron" aria-hidden="true"/></button>)}</div><div className="checklist-footer"><span><span className="small-dot"/>{done===5?'Missão cumprida. Salve seu progresso.':'Um passo mais perto da próxima história.'}</span><button className="text-link" onClick={saveAll} disabled={isSaving || loading}>{isSaving?'Salvando…':'Salvar checklist'} <ArrowRight size={16}/></button></div></section>
              <div className="dashboard-right"><section className="next-episode card"><div className="section-heading"><p className="eyebrow">PRÓXIMO EPISÓDIO</p><Clapperboard size={17} aria-hidden="true"/></div><div className="episode-cover" aria-hidden="true"><span className="episode-format">ORIGINAL SERIES</span><div className="episode-road"/><span className="episode-cover-title">CADA ESCOLHA.<br/><em>UMA HISTÓRIA.</em></span><span className="episode-stamp">FV / VI</span></div><div className="next-episode-copy"><div className="episode-meta"><span className="small-dot"/>{nextVideo?.status || 'Semana concluída'}{nextVideo && <span>• {nextVideo.dia} / {nextVideo.hora}</span>}</div><h3>{nextVideo?.titulo || 'Todos os episódios foram postados.'}</h3><button className="text-link" onClick={()=>navigate('calendario')}>Organizar calendário <ArrowUpRight size={17}/></button></div></section><section className="creative-tip"><span className="tip-symbol" aria-hidden="true"><Sparkles size={21}/></span><div><p className="eyebrow">DIREÇÃO CRIATIVA</p><h3>Dois segundos para começar.</h3><p>Abra com o conflito. Termine com uma escolha que faça sentido para a história.</p></div></section></div>
            </div>
            <section className="workflow-strip"><div><span className="eyebrow">DO RASCUNHO À TELA</span><h2>Uma boa história merece um bom fluxo.</h2></div><div className="workflow-steps"><span><Brain size={17}/>Ideia</span><ArrowRight size={13}/><span><PenLine size={17}/>Roteiro</span><ArrowRight size={13}/><span><Play size={17}/>Produção</span><ArrowRight size={13}/><span><Share2 size={17}/>Publicação</span></div><button className="text-link" onClick={()=>navigate('maquina')}>Ver o fluxo <ArrowUpRight size={17}/></button></section>
          </>}

        {tab==='ideias' && (
          <section id="ideias-top">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-4xl sm:text-5xl">GERADOR <span className="neon-green">DE IDEIAS</span></h2><p className="text-muted mt-1 max-w-[640px]">Sorteia 10 ideias prontas. Escolhe 1, copia e já grava. Sem travar, sem enrolar.</p></div><button onClick={gerarIdeias} className="bg-accent font-bold px-5 py-3.5 rounded-2xl flex items-center gap-2"><RefreshCw size={18}/> GERAR 10 IDEIAS AGORA</button></div>
            <div className="flex gap-2 mt-4 flex-wrap"><span className="chip">36 ideias no banco</span><span className="chip">6 formatos</span><span className="chip">Gancho 0-2s em todas</span></div>
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              {ideas.map((it,idx)=>(
                <article key={idx} className="card p-5">
                  <div className="flex gap-2 flex-wrap"><span className="chip bg-accent text-inverse border-none">{it.formato}</span><span className="chip">{it.duracao}</span><span className="chip">IDEIA #{idx+1}</span></div>
                  <h3 className="font-bold text-lg leading-snug mt-3">{it.titulo}</h3>
                  <p className="text-sm mt-2"><span className="text-accent font-bold">GANCHO 0-2s:</span> {it.gancho}</p>
                  <p className="text-sm mt-2"><span className="text-success font-bold">CTA:</span> {it.cta}</p>
                  <button onClick={()=>copyText(`IDEIA: ${it.titulo}\nFORMATO: ${it.formato}\nGANCHO: ${it.gancho}\nCTA: ${it.cta}`, it.titulo)} className="mt-4 w-full bg-soft text-inverse font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Copy size={17}/> COPIAR IDEIA</button>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab==='roteiros' && (
          <section>
            <h2 className="font-display text-4xl sm:text-5xl">ROTEIROS <span className="neon-pink">KAIROGEN</span></h2>
            <p className="text-muted mt-1 max-w-[700px]">Modelos de estrutura para orientar seus episódios. Você também pode criar novos roteiros pela área Produção com IA.</p>
            <div className="grid lg:grid-cols-2 gap-4 mt-5">
              {TEMPLATES.map(t=>(
                <article key={t.titulo} className="card p-5 flex flex-col">
                  <h3 className="font-display text-2xl text-accent">{t.titulo}</h3><p className="text-sm text-muted">{t.desc}</p>
                  <pre className="whitespace-pre-wrap text-[13px] leading-relaxed bg-canvas border border-line rounded-xl p-4 mt-3 flex-1 overflow-x-auto">{t.corpo}</pre>
                  <button onClick={()=>copyText(t.corpo, t.titulo)} className="mt-3 bg-success text-inverse font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Copy size={17}/> COPIAR ROTEIRO COMPLETO</button>
                </article>
              ))}
            </div>
            <div className="card p-5 mt-4"><h3 className="font-display text-2xl">Produza pelo próprio estúdio</h3><p className="text-muted mt-3">Use os modelos como referência. Crie novos episódios em Produção com IA e leve suas cenas à KAIROGEN pela área de vídeos.</p><div className="flex gap-4 flex-wrap"><button className="text-link" onClick={()=>navigate('producao')}>Criar sete episódios</button><button className="text-link" onClick={()=>navigate('midia')}>Produzir as cenas</button></div></div>
          </section>
        )}

        {tab==='calendario' && (
          <section>
            <div className="flex flex-wrap justify-between items-end gap-3"><div><h2 className="font-display text-4xl sm:text-5xl">CALENDÁRIO <span className="neon-green">DE POSTAGEM</span></h2><p className="text-muted mt-1">7 dias, 7 vídeos. Edita o título, escolhe horário e status.</p></div><button disabled={isSaving || loading} aria-busy={isSaving} onClick={saveAll} className="bg-success text-inverse font-bold px-5 py-3 rounded-xl flex items-center gap-2"><Save size={18}/> SALVAR CALENDÁRIO</button></div>
            <div className="flex gap-2 mt-4 flex-wrap"><span className="chip">🟢 {posted} Postados</span><span className="chip">🟡 {ready} Prontos</span><span className="chip">⚪ {7-posted-ready} Pendentes</span><span className="chip">Horários propostos: 12h • 18h • 21h</span></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-5">
              {calendar.map((d,i)=>(
                <article key={d.dia} className="card p-4">
                  <div className="flex justify-between items-center"><span className="font-display text-2xl">{d.dia}</span><span className={`text-xs font-bold px-2 py-1 rounded-full ${d.status==='Postado'?'bg-success text-inverse':d.status==='Pronto'?'bg-warning text-inverse':'bg-line'}`}>{d.status.toUpperCase()}</span></div>
                  <p className="text-xs text-muted">{d.data}</p>
                  <label className="text-xs font-bold mt-3 block">TÍTULO DO VÍDEO</label>
                  <input aria-label={`Título do vídeo de ${d.dia}`} value={d.titulo} onChange={e=>{ const n=[...calendar]; n[i].titulo=e.target.value; setCalendar(n); }} className="mt-1" />
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div><label className="text-xs font-bold">HORÁRIO</label><select aria-label={`Horário de ${d.dia}`} value={d.hora} onChange={e=>{ const n=[...calendar]; n[i].hora=e.target.value; setCalendar(n); }} className="mt-1"><option>12h</option><option>18h</option><option>21h</option></select></div>
                    <div><label className="text-xs font-bold">STATUS</label><select aria-label={`Status de ${d.dia}`} value={d.status} onChange={e=>{ const n=[...calendar]; n[i].status=e.target.value as DayPlan['status']; setCalendar(n); }} className="mt-1"><option>Pendente</option><option>Pronto</option><option>Postado</option></select></div>
                  </div>
                  <button onClick={()=>{ const n=[...calendar]; n[i].status = n[i].status==='Postado'?'Pendente': n[i].status==='Pronto'?'Postado':'Pronto'; setCalendar(n); }} className="mt-3 w-full border border-line-strong py-2.5 rounded-xl text-sm font-bold">AVANÇAR STATUS →</button>
                </article>
              ))}
              <div className="card p-5 bg-accent/10 flex flex-col justify-center"><h3 className="font-display text-2xl">DICA 1000 GRAU</h3><p className="text-sm text-soft mt-1">Posta 18h nos dias de semana e 12h no fim de semana pra testar. O que bombar, repete na próxima semana.</p></div>
            </div>
          </section>
        )}

        {tab==='legendas' && (
          <section>
            <h2 className="font-display text-4xl sm:text-5xl">LEGENDAS + <span className="neon-pink">HASHTAGS</span></h2>
            <p className="text-muted mt-1">15 legendas prontas. Copia, cola e posta. Troca 1 palavra e já fica com tua cara.</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
              {CAPTIONS.map((c,i)=>(
                <article key={i} className="card p-5 flex flex-col"><span className="chip self-start">LEGENDA #{i+1}</span><p className="font-bold leading-snug mt-3 flex-1">{c.texto}</p><p className="text-xs text-accent mt-2 break-words">{c.tags}</p><button onClick={()=>copyText(`${c.texto}\n\n${c.tags}`, `Legenda ${i+1}`)} className="mt-3 bg-soft text-inverse font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"><Copy size={16}/> COPIAR LEGENDA</button></article>
              ))}
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-5">
              <div className="card p-5"><h3 className="font-display text-2xl text-success">🔁 LOOP</h3><p className="text-sm text-muted mt-1">Termina o vídeo com a mesma frase do começo. O cérebro quer rever pra entender.</p></div>
              <div className="card p-5"><h3 className="font-display text-2xl text-accent">😱 CLIFFHANGER</h3><p className="text-sm text-muted mt-1">Nunca entrega tudo. Deixa 1 pergunta sem resposta e promete a parte 2.</p></div>
              <div className="card p-5"><h3 className="font-display text-2xl text-warning">💬 COMENTÁRIO</h3><p className="text-sm text-muted mt-1">CTA de 1 ou 2 é fácil de responder. Comentário fácil = comentário que vem.</p></div>
            </div>
          </section>
        )}

        {tab==='metricas' && (
          <section>
            <div className="flex flex-wrap justify-between items-end gap-3"><div><h2 className="font-display text-4xl sm:text-5xl">MÉTRICAS <span className="neon-green">SEM ENROLAÇÃO</span></h2><p className="text-muted mt-1">Preenche depois de postar. Registre resultados reais e compare períodos equivalentes.</p></div><button disabled={isSaving || loading} aria-busy={isSaving} onClick={saveAll} className="bg-success text-inverse font-bold px-5 py-3 rounded-xl flex items-center gap-2"><Save size={18}/> SALVAR MÉTRICAS</button></div>
            <div className="card p-4 sm:p-5 mt-5 overflow-x-auto"><table aria-label="Métricas dos vídeos publicados" className="w-full min-w-[720px] text-sm"><thead><tr className="text-left text-muted"><th scope="col" className="py-2 pr-2">VÍDEO</th><th scope="col" className="py-2 pr-2">VIEWS</th><th scope="col" className="py-2 pr-2">RETENÇÃO %</th><th scope="col" className="py-2 pr-2">COMENTÁRIOS</th><th scope="col" className="py-2">+ SEGUIDORES</th></tr></thead><tbody>{metrics.map((m,i)=>(<tr key={i} className="border-t border-line"><td className="py-2 pr-2"><input aria-label={`Título do vídeo, linha ${i+1}`} value={m.video} onChange={e=>{ const n=[...metrics]; n[i].video=e.target.value; setMetrics(n); }} /></td><td className="py-2 pr-2"><input aria-label={`Visualizações, linha ${i+1}`} inputMode="decimal" value={m.views} onChange={e=>{ const n=[...metrics]; n[i].views=e.target.value; setMetrics(n); }} placeholder="0"/></td><td className="py-2 pr-2"><input aria-label={`Retenção percentual, linha ${i+1}`} inputMode="decimal" value={m.retencao} onChange={e=>{ const n=[...metrics]; n[i].retencao=e.target.value; setMetrics(n); }} placeholder="0"/></td><td className="py-2 pr-2"><input aria-label={`Comentários, linha ${i+1}`} inputMode="decimal" value={m.comentarios} onChange={e=>{ const n=[...metrics]; n[i].comentarios=e.target.value; setMetrics(n); }} placeholder="0"/></td><td className="py-2"><input aria-label={`Novos seguidores, linha ${i+1}`} inputMode="decimal" value={m.seguidores} onChange={e=>{ const n=[...metrics]; n[i].seguidores=e.target.value; setMetrics(n); }} placeholder="0"/></td></tr>))}</tbody></table></div>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="card p-5"><p className="text-xs font-bold text-muted flex items-center gap-1"><Eye size={14}/> TOTAL VIEWS</p><p className="font-display text-4xl mt-1">{totalViews.toLocaleString('pt-BR')}</p></div>
              <div className="card p-5"><p className="text-xs font-bold text-muted flex items-center gap-1"><MessageCircle size={14}/> TOTAL COMENTÁRIOS</p><p className="font-display text-4xl mt-1">{totalComments.toLocaleString('pt-BR')}</p></div>
              <div className="card p-5"><p className="text-xs font-bold text-muted flex items-center gap-1"><TrendingUp size={14}/> MÉDIA RETENÇÃO</p><p className="font-display text-4xl mt-1">{metrics.filter(m=>m.retencao).length? Math.round(metrics.reduce((s,m)=>s+(parseFloat(m.retencao)||0),0)/metrics.filter(m=>m.retencao).length):0}%</p></div>
            </div>
            <div className="card p-5 mt-4 border-warning"><h3 className="font-display text-2xl flex items-center gap-2"><Brain className="text-warning"/> REGRA DE OURO: O QUE REPETIR NA PRÓXIMA SEMANA</h3><textarea aria-label="Aprendizado para a próxima semana" rows={3} value={regra} onChange={e=>setRegra(e.target.value)} className="mt-3"/><p className="text-sm text-muted mt-2">👉 Repete o formato com mais comentários. Se retenção &lt; 40%, muda o gancho. Se comentário &lt; 50, muda o CTA pra 1 ou 2. Se views caíram, muda o horário — não o formato.</p></div>
          </section>
        )}

        {tab==='rodar' && <section className="card p-6"><p className="eyebrow">SEU ESTÚDIO, PASSO A PASSO</p><h2 className="font-display text-4xl mt-3">Prepare sua primeira semana</h2><p className="text-muted mt-3">Marque as etapas concluídas. O progresso é salvo automaticamente no banco.</p><div className="space-y-3 mt-5">{['Entrar no estúdio privado','Escolher ideias e gerar os roteiros','Autorizar a conta KAIROGEN','Autorizar a conta HubPost','Produzir e revisar os vídeos','Confirmar os agendamentos'].map((label,index)=><button key={label} aria-pressed={rodarChecklist[index]} aria-label={`Marcar Passo ${index+1} como feito`} onClick={()=>toggleRodar(index)} className="checklist-row w-full"><span className="step-check">{rodarChecklist[index]?<Check size={18}/>:index+1}</span><span className="step-copy"><strong>{label}</strong></span></button>)}</div><div className="flex gap-4 flex-wrap mt-5"><button className="primary-button" onClick={()=>navigate('producao')}>Criar a semana</button><button className="text-link" onClick={()=>navigate('integracoes')}>Conectar minhas contas</button></div><section className="mt-5"><h3 className="font-display text-2xl">Bloco de foco</h3><p className="font-display text-4xl" aria-live="off">{timerLabel}</p><div className="flex gap-4"><button className="text-link" onClick={()=>setTimerRunning(!timerRunning)}>{timerRunning?'PAUSAR':'COMEÇAR'}</button><button className="text-link" onClick={()=>selectTimerPhase(timerPhase)}>ZERAR FASE</button></div></section></section>}
        {tab==='maquina' && <section className="space-y-5"><div><p className="eyebrow">TUDO PELA FÁBRICA</p><h2 className="font-display text-4xl mt-3">Um estúdio. Do roteiro ao público.</h2><p className="text-muted mt-3">Crie, revise e acompanhe sua produção neste painel. As autorizações das contas são feitas uma vez e os dados ficam no banco.</p></div><div className="grid md:grid-cols-3 gap-5">{[{title:'01 / Roteiros',description:'Defina o tema, consulte o custo e crie a semana com IA. Revise antes de produzir.',target:'producao' as Tab,action:'Criar episódios'},{title:'02 / Imagem e vídeo',description:'Conecte a KAIROGEN e consulte o custo da cena antes de autorizar a geração.',target:'midia' as Tab,action:'Produzir vídeos'},{title:'03 / Distribuição',description:'Escolha a conta, revise a legenda e confirme o horário no HubPost quando a função estiver disponível.',target:'midia' as Tab,action:'Preparar agendamento'}].map(item=><article key={item.title} className="card p-6"><h3 className="font-display text-3xl">{item.title}</h3><p className="text-muted mt-3">{item.description}</p><button className="text-link mt-3" onClick={()=>navigate(item.target)}>{item.action}<ArrowUpRight size={17}/></button></article>)}</div><section className="card p-6"><h3 className="font-display text-2xl">Sua operação fica com você</h3><p className="text-muted mt-3">Checklist, calendário e métricas são salvos automaticamente. Geração e agendamento exigem confirmação; nenhum botão deve simular uma ação concluída.</p><button className="text-link mt-3" onClick={()=>navigate('integracoes')}>Ver conexões autorizadas</button></section></section>}

          </div>
        <div className="flex flex-wrap gap-4 mt-5"><button className="text-link" onClick={exportBackup}>Baixar backup dos meus dados</button><button className="text-link" disabled={isSaving || loading} onClick={async()=>{const saved=await saveAll();if(saved){await api('auth.logout');window.location.reload();}}}>Sair do estúdio</button></div>
        <footer className="studio-footer"><span>FÁBRICA VIRAL <span className="footer-mark">/</span> 1000 GRAU</span><p>Histórias originais. Inspiração em GTA VI. Projeto independente, sem vínculo com a Rockstar Games.</p></footer>
        </main>
      </div>
    </div>
  );
}
