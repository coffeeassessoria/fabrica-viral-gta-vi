# Fábrica Viral — sistema visual e regras de interface

## Contexto e objetivos

A interface organiza a criação de histórias originais em um estúdio escuro, com paisagem litorânea, tipografia expressiva e referências cromáticas ao universo visual de GTA VI.

O produto real é a Fábrica Viral, não o site da Rockstar. Público inferido pelo código: operadores que organizam ideias, roteiros, agenda e métricas; a aplicação atual tem acesso privado de operador único. A interface **must** manter o contrato `POST actions` e as coleções `fabrica_checklist`, `fabrica_calendario`, `fabrica_metricas` e `fabrica_rodar`. Ela **must not** representar conexão, geração de vídeo ou postagem como concluídas sem resultado real.

A [referência oficial da Rockstar](https://www.rockstargames.com/VI) orienta atmosfera, contraste e cores. A paisagem SVG e a marca FV são próprias. Não foram extraídos fontes proprietárias, cenas, personagens ou logotipos. A interface **must** identificar o projeto como independente e **should** evitar informações de lançamento, pois não fazem parte do fluxo operacional.

## Tokens e fundamentos

`index.css` é a fonte dos tokens. Componentes **must** usar variáveis semânticas ou aliases de utilitários, sem novas cores hexadecimais locais. Valores RGB primitivos existem para compatibilidade com opacidade no Tailwind. Os aliases incluídos no próprio CSS permitem usar os dois arquivos no ambiente original sem exigir alteração de configuração do Tailwind.

| Grupo | Tokens | Aplicação |
| --- | --- | --- |
| Superfícies | `--color-canvas`, `--color-panel`, `--color-inset`, `--color-elevated` | Plano principal, cartões, campos, destaque secundário |
| Texto | `--color-text`, `--color-muted`, `--color-soft`, `--color-inverse` | Branco, secundário lilás, apoio, tinta sobre ações claras |
| Ações | `--color-accent`, `--color-accent-hover` | Rosa claro com texto escuro; ação principal e links de ação |
| Estados | `--color-success`, `--color-warning`, `--color-error`, `--color-focus` | Confirmação, indisponibilidade, erro, foco |
| Bordas | `--color-line`, `--color-line-strong` | Separação visual; campos e limites interativos |
| Referência | `--color-brand-lavender`, `--color-brand-raised`, `--color-brand-strong` | Lilás, ameixa e azul profundo do briefing |
| Ilustração | `--scene-*` | Apenas desenho decorativo; não transmitir informação funcional |
| Corpo | `--font-body` | Manrope; fallback do sistema se a fonte externa falhar |
| Display | `--font-display` | ArtDecoMedium se fornecida; Bebas Neue; Impact; sans-serif |
| Tipos | `--text-xs` a `--text-4xl` | 14,4 / 16 / 16,8 / 19,2 / 21,6 / 24,6 / 28,8 / 38,4 px em raiz de 16px |
| Display ampliado | `--text-hero` | Extensão semântica responsiva para a abertura; não usar em dados ou navegação |
| Espaçamento | `--space-1` a `--space-7` | 16,8 / 24 / 28,8 / 33,6 / 48 / 57,6 / 62,4 px |
| Densidade de controles | `--space-control`, `--space-icon`, `--space-micro` | Extensões de 12 / 8 / 4 px para controles, ícones e pequenos ajustes recorrentes |
| Geometria | `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-pill`, `--control-min` | 4 / 16,8 / 33,6 px; arredondamento integral; alvo mínimo de 44px |
| Movimento | `--duration-instant`, `--duration-fast`, `--duration-normal` | 150 / 200 / 500 ms; redução de movimento desativa transições e animações |

Texto principal **must** usar 19,2px/1,4 como base; metadados e controles **must** usar a escala, com mínimo funcional de 14,4px. A marca e os detalhes da ilustração são elementos gráficos, não controles. ArtDecoMedium **must not** ser declarada como instalada: nenhum arquivo dessa fonte foi fornecido. O uso de fontes externas **should** ser substituído por hospedagem própria quando houver requisitos de privacidade ou operação sem rede.

## Componentes: anatomia, variantes, estados e comportamento

Todos os controles **must** implementar o contrato de estados abaixo. Estados não aplicáveis **must** ser explicitamente tratados como não interativos, sem simular botão ou erro de negócio.

| Família / anatomia | Default | Hover | Focus-visible | Active | Disabled | Loading | Error |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Botão primário: ícone + rótulo + seta | Fundo accent, texto inverse | Accent-hover | Contorno focus de 3px e afastamento de 4px | Deslocamento de 1px | Opacidade reduzida, sem ativação | Rótulo de operação + ícone; sem envio repetido | Mensagem associada no status; repetir a ação é possível |
| Botão secundário / link de ação | Borda forte ou texto accent | Borda/ação accent e sublinhado no link | Mesmo contorno visível | Resposta de pressionamento | `disabled` nativo para botão; link indisponível sem href e com motivo | Para salvar: `aria-busy`, texto e bloqueio | Falha de copiar/salvar anunciada, sem sucesso falso |
| Navegação: ícone + rótulo + indicador | Texto muted | Fundo panel | Contorno visível sem depender de hover | `aria-current=page` e destaque | Item indisponível **must** informar motivo | Navegação local não simula carregamento; dados usam status global | Aviso de conexão sem bloquear troca de área |
| Campo / select / textarea: nome + controle | Superfície inset, borda forte | Borda muted | Contorno focus | Texto/seleção nativos | Nativo com motivo visível | Campo editável continua; ação de salvar fica ocupada | `aria-invalid=true`, descrição do erro e preservação do valor |
| Linha de checklist: número + texto + detalhe | Contorno do marcador e separador | Marcador accent | Contorno no botão inteiro | `aria-pressed`, check e texto riscado | Nativo se operação futura exigir | Só o salvamento tem estado ocupado | Falha de salvar não desfaz edição local |
| Métrica / cartão informativo | Rótulo + valor + apoio | Sem elevação que sugira ação | Não recebe foco se não interativo | Não aplicável | Não aplicável; valor ausente usa travessão | Texto “Carregando seu progresso” durante leitura | Aviso de indisponibilidade; não inventar resultados |
| Feedback: aviso / status | Ausente sem mensagem | Sem ação implícita | Só ação explícita recebe foco | Não aplicável | Não aplicável | Texto + ícone, nunca só animação | Mensagem clara em região anunciável; dados não são apagados |
| Menu móvel: diálogo + links + fechar | Fechado fora da árvore de interação | Mesmo estilo do desktop | Foco inicial em Fechar | Item atual identificado | Conteúdo ao fundo `inert` durante abertura | Não simula loading próprio | Escape e Fechar sempre disponíveis |

Botões **must** responder a Enter/Espaço e clique/toque por elementos nativos. Links **must** usar Enter e indicar nova aba no nome acessível. Selects e campos **must** conservar teclado nativo, sem atalhos de letra globais. Checklist **must** anunciar estado pressionado. O menu **must** conter Tab/Shift+Tab, fechar com Escape e devolver foco ao acionador; seleção de página **must** levar o foco ao título do conteúdo.

Controles **must** usar `--space-control` internamente, `--space-icon` entre ícone e rótulo, texto da escala e alvo mínimo `--control-min`. Cartões **must** usar `--space-1` ou `--space-2` e `--radius-sm`. Recomendações de tipografia e espaçamento **should** ser implementadas no token compartilhado antes de criar nova exceção.

### Responsividade, textos longos e ausência de dados

- Desktop a partir de 1100px **must** mostrar menu lateral; abaixo disso **must** usar menu móvel sobreposto, com fundo inerte.
- Resumo **must** passar de quatro para duas colunas abaixo de 700px; checklist e próximo episódio **must** ficar em uma coluna.
- A página **must** refluir em 320px sem rolagem horizontal global. A tabela de métricas **may** rolar dentro de seu próprio contêiner, preservando relação entre colunas.
- Títulos longos **must** quebrar sem cobrir ações. Inputs longos **must** preservar edição e navegação do cursor. Blocos de prompt **must** quebrar linhas ou rolar dentro do contêiner.
- Calendário concluído **must** apresentar “Todos os episódios foram postados”, sem reciclar o primeiro como próximo. Métrica não preenchida **must** aparecer como “—” na visão geral; zero registrado continua sendo zero.
- Ideias são amostradas de um banco local, não geradas por modelo remoto. A interface **must** chamar essa ação de explorar/sortear e **must not** afirmar uso de IA ao clicar.
- Requisições **must** ter timeout. O salvamento **must** validar o workspace integral e conferir sua revisão antes de substituir o registro; conflito **must** preservar o rascunho.

### Densidade de componentes

O briefing trouxe 57 botões, 31 links, 8 inputs, 2 navegações e 2 listas como diagnóstico de extração. Esses números **must** ser tratados como dados da referência, não inventário confirmado da Fábrica nem metas artificiais. O inventário real por área é registrado em `qa-browser.json` quando a verificação é executada. A quantidade de controles muda com a aba e com os dados carregados.

## Acessibilidade e critérios verificáveis

Meta: [WCAG 2.2 AA](https://www.w3.org/WAI/WCAG22/quickref/). A aprovação automatizada **must not** ser descrita como certificação integral de acessibilidade.

| Aceite | Passa | Falha |
| --- | --- | --- |
| Contraste | Texto normal ≥4,5:1, texto grande ≥3:1; limites/indicadores interativos relevantes ≥3:1 | Texto claro em rosa claro ou estado transmitido só por cor |
| Teclado | Primeiro Tab acessa “Pular”; Enter chega ao main; todas as ações funcionam | Ação depende de mouse ou foco fica preso |
| Foco | Contorno visível, não coberto pela barra/feedback, permanece em todos os temas | `outline:none` remove foco de controle |
| Menu móvel | Tab circula só no menu; Escape fecha e devolve foco | Fundo permanece acionável ou foco desaparece |
| Campos | Cada controle tem nome acessível próprio; tabela tem cabeçalhos de coluna | Leitor anuncia apenas “editar” sem contexto |
| Feedback | Cópia e salvamento são anunciados por status; falha não confirma sucesso | Mensagem apenas visual ou progresso falsamente salvo |
| Movimento | Com redução de movimento, transições e animações param | Spinner/efeito decorativo continua animado |
| Refluxo | 320px mantém conteúdo; tabela rola localmente | Overflow horizontal no documento |
| Zoom / leitura | Texto até 200% e espaçamento WCAG não escondem controles ou informação | Texto cortado ou sobreposição bloqueia uma ação |
| Toque | Ações têm alvo mínimo de 44px ou área equivalente | Ícone clicável diminuto sem expansão de área |

Cada item acima **must** ser conferido na implementação final. Auditoria automática **should** ser complementada por leitor de tela e usuários de teclado; esses testes humanos não foram presumidos nesta entrega.

## Conteúdo e tom

Texto **must** ser curto, descritivo e fiel ao que o clique faz. Exemplos: “Explorar 10 ideias”, “Salvar progresso”, “Organizar calendário”. Feedback **must** explicar resultado e próximo passo: “Não foi possível salvar. Seus dados continuam nesta tela. Tente salvar novamente.”

O sistema **must not** usar “AO VIVO”, “conectado” ou “publicado” apenas como decoração. Horários **must** ser tratados como proposta, não como desempenho comprovado. Conteúdo editorial legado foi preservado e **should** passar por revisão específica antes de uso público, sobretudo afirmações de estatísticas, promessas de viralização e instruções de integrações externas.

## Antipadrões, proibições e migração

- Implementações **must not** esconder indicadores de foco, usar placeholder como único rótulo ou remover todas as barras de rolagem.
- Implementações **must not** inserir chaves reais no bloco de configuração ou afirmar que o exemplo de MCP foi validado.
- Implementações **must not** usar uma linha de botões recortada como única navegação em telas pequenas.
- Migração **must** preservar tipos e nomes de coleções existentes. A operação local **must** usar o adaptador de API do Vite e a hospedagem **must** usar as funções serverless com o banco externo.
- A aplicação inclui `App.tsx`, `index.css`, `AccessGate.tsx`, componentes Studio, `persistence/`, `server/` e `api/`. A pasta original **must** receber backup antes da substituição.
- Há login privado de operador único. Conexões e ações externas **must** ser validadas com autorização da conta, sem simular que uma postagem ou geração ocorreu.

## Checklist de QA

- [ ] Conferir sete estados por família e seus casos não aplicáveis.
- [ ] Abrir as oito áreas em desktop e celular.
- [ ] Testar sorteio, cópia, checklist, calendário, métricas e cronômetro.
- [ ] Simular leitura/salvamento bem-sucedidos e falha do serviço.
- [ ] Executar build e análise TypeScript.
- [ ] Executar axe nas oito áreas e registrar resultados.
- [ ] Conferir foco, Escape, Tab/Shift+Tab, menu e link de salto.
- [ ] Conferir 320px, 390px, 1440px, zoom e redução de movimento.
- [ ] Conferir fontes indisponíveis e texto longo.
- [ ] Revalidar o endpoint real no ambiente proprietário antes de publicar.

## Mesa de produção e revisão de publicação

- A mesa **must** preservar roteiros, etapa e link de vídeo no workspace. O pacote exportado **must** indicar produção externa pelo Claude. A integração direta KAIROGEN autorizada pelo usuário **must** separar aprovação de roteiro, consulta de custo e confirmação paga. Cenas carregadas automaticamente **must not** disparar geração; mudar cena **must** invalidar cotação e consentimento anteriores.
- Campos de texto longo **must** ter rótulos associados por for/id. URLs incompletas **must** continuar editáveis como rascunho; a validação para publicação **must** exigir HTTPS e ausência de credenciais no endereço.
- Conta, legenda, vídeo, modalidade e horário **must** ser apresentados antes da confirmação. A ação final **must** ficar desabilitada até o consentimento por envio e durante a requisição; alterações **must** invalidar a revisão anterior.
- Repetição após falha **must** reutilizar o ID daquela revisão. Resultado incerto **must** orientar a consulta de histórico, sem confirmar publicação ou reenviar automaticamente.
- Modalidades sem suporte confirmado **must** ficar bloqueadas com motivo. Analytics ausente **must** manter os valores como registros manuais, sem anunciar sincronização.
- Componentes novos **must** seguir a tabela comum de estados e tokens. Os testes **must** cobrir teclado nativo, nome dos campos, ausência de overflow em celular, consentimento e restauração dos roteiros após reabrir o navegador.

- A distribuição **must** distinguir envio de arquivo à biblioteca de publicação em rede. Selecionar um arquivo **must not** transmiti-lo antes do botão explícito. A confirmação final **must** mostrar o nome da mídia e todas as opções específicas da plataforma.
- A interface **must** mapear accountId e mediaId do contrato real do HubPost. Formatos desconhecidos de upload **must** ser rejeitados antes de transmitir o arquivo. Endereços assinados **must not** aparecer em logs ou mensagens de diagnóstico.
- Rascunho, agendamento e publicação imediata **must** seguir a semântica anunciada no schema ativo. A modalidade **must not** ser inferida somente de um botão visual.

## Linha de produção por episódio

- O orçamento **must** exibir todas as cenas, durações geradas, total e consentimento único antes de iniciar. Consultar preço **must not** gerar vídeos.
- A navegação **must** usar seleção de episódio e etapas nomeadas; editores e ferramentas avançadas **should** ficar recolhidos inicialmente. Estados de fila e erro **must** aparecer em texto, com ações descritivas e feedback anunciável.
- A interface **must** distinguir cenas recebidas, revisão visual, montagem e publicação. Aprovação técnica **must not** prometer qualidade visual automática. Cancelamento **must** preservar registros e informar o efeito sobre uma cena já enviada.
- Estados, teclado, toque, foco e tokens **must** seguir a tabela comum deste documento. Cotações expiradas e roteiro alterado **must** desabilitar confirmação do orçamento anterior.
