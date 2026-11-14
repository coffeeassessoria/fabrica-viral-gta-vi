# Fechamento da prévia — 13/11/2026

- Commit 81a11d6 enviado à branch preview. Deploy https://fabrica-viral-gta-5kpuirxls-vinicius-arenales-projects.vercel.app confirmado READY. Alias estável: https://fabrica-viral-gta-vi-git-preview-vinicius-arenales-projects.vercel.app.
- Na função HTTPS hospedada, HubPost autorizado confirmou draft, schedule e publish, biblioteca e upload disponíveis, analytics ausente. list_media e list_posts retornaram sucesso, sem mídia nem publicações cadastradas.
- A preparação de upload foi consultada com metadados mínimos, sem transmitir arquivo nem confirmar ativo. O provedor retornou uploadUrl HTTPS e filePath no formato esperado, validando o contrato da preparação. Endereços assinados não foram exibidos nem gravados em diagnóstico.
- O teste de encerramento teve uma colisão de variável no helper local, após as verificações concluídas; o helper foi corrigido e os dois arquivos HTTP temporários foram removidos da pasta privada. O código da aplicação não foi afetado. O registro sanitizado está em tests/artifacts/hubpost-final-verification.json, ignorado no Git.
- Nenhum arquivo, vídeo, rascunho, agendamento ou postagem foi criado pelo teste. Permanece pendente validar upload completo e publicação real com o primeiro vídeo aprovado.

# Contrato real do HubPost — 13/11/2026

- Aprovação explícita recebida para commit/push e atualização somente da prévia. Etapa inicial a61aa31 hospedada em dpl_HUtr71f3ZCa4z5uwiGm8oTrCjoDU, READY, alias da branch preservado.
- Consulta HTTPS autenticada obteve o schema real. create_post usa accountId, caption, mediaIds, platformOptions e scheduledAt. Omitir scheduledAt cria rascunho; data futura agenda; data já vencida publica imediatamente, conforme descrição do provedor. Biblioteca e upload foram adaptados a list_media, get_upload_url e confirm_upload.
- Corrigido o mapeamento real das contas, que retorna accountId. O formulário inclui opções de TikTok e YouTube, privacidade escolhida pelo operador, título e público infantil no YouTube e indicação de mídia realista por IA. Todas as opções aparecem na revisão.
- Upload direto usa arquivo escolhido pelo usuário, Content-Type/tamanho exatos e URL HTTPS assinada retornada pelo HubPost. O botão de upload é separado da confirmação de postagem. Limite do schema: 1 GB; MP4, WebM e QuickTime. Nenhum upload real executado nos testes.
- O backend preserva production se uma aba antiga enviar um workspace sem o novo campo. O teste real de banco confirmou essa compatibilidade.
- npm test: passou com fixture do schema real, três modalidades, opções obrigatórias, proteção contra repetição/concorrência e resultado incerto. Navegador real: persistência dos sete roteiros, recuperação de rascunho, seleção de biblioteca e privacidade e consentimento de publicação simulados, sem erros JavaScript, sem violações axe detectadas e sem overflow em 390px. Isso não certifica acessibilidade integral.
- Build TypeScript/Vite: concluído; aproximadamente 347 kB JS / 108 kB gzip. Avisos de diretiva use-client do lucide são informativos.
- get_analytics continua ausente. A área de métricas mantém registros manuais; followersCount das contas não equivale a retenção ou novos seguidores por vídeo.
- A integração não foi validada por postagem real: nenhuma publicação, agendamento ou rascunho foi criado no HubPost durante esses testes. Falta um vídeo aprovado para o teste final de envio de mídia e publicação.

As seções abaixo registram as etapas anteriores.

# Fluxo Claude/KAIROGEN e HubPost — revisão local de 13/11/2026

- O usuário esclareceu que a KAIROGEN será operada somente pelo Claude. A interface nova retira a conexão e geração direta e permite armazenar roteiros, importar opcionalmente os sete já preparados e exportar o pacote Markdown.
- Produção é um campo opcional no workspace JSON. Dados antigos sem esse campo continuam válidos; checklist, calendário, métricas e histórico são preservados. URLs incompletas podem ser salvas como rascunho; o link final é validado antes de qualquer postagem.
- Consulta autenticada real na prévia confirmou HubPost autorizado, contas TIKTOK @gtavi1000grau e YOUTUBE @fabricaviralgtavi1000grau. Ferramentas anunciadas: get_account, list_social_accounts, list_posts, get_post, create_post, edit_post, delete_post, list_media, show_upload_widget, get_upload_url e confirm_upload. get_analytics não está disponível.
- A revisão de publicação exige conta, vídeo, legenda, modalidade e confirmação. O contrato confere os campos do schema antes do envio. Schemas ainda não adaptados e mídia que exige upload sem adaptador ficam bloqueados; a capacidade de envio do vídeo real ainda precisa de validação após implantação.
- Idempotência usa fv_jobs com UUID por revisão e hash dos parâmetros. Resposta confirmada é reutilizada; um envio pendente ou de resultado incerto nunca é repetido automaticamente. A rota genérica não permite contornar a revisão para create_post.
- Navegador real: sete roteiros, URL parcial, checklist, calendário, métricas, regra e setup restaurados após fechar todo o navegador e reiniciar o servidor; rascunho interrompido recuperado. Postagem simulada exige revisão e consentimento, preserva o ID após falha e não chama o HubPost real. Mesa de produção e postagem sem erros JavaScript, sem violações axe detectadas e sem overflow em 390px. Evidência: tests/artifacts/persistence-browser.json (ignorado no Git).
- Build TypeScript/Vite concluído; bundle de aproximadamente 335 kB JS / 105 kB gzip. Avisos use-client de lucide-react são informativos.
- npm test passou no banco real com registros isolados: compatibilidade de workspace, roteiro com URL parcial, sessão, conflito, criptografia, contrato de envio, repetição, concorrência e resultado incerto. Os envios dos testes são callbacks simulados, sem conexão ao HubPost.
- Canal YouTube criado após confirmação específica dos Termos: UCV92NvRghmpRW54P0zjrB2g, @FabricaViralGTAVI1000Grau. Nenhum vídeo enviado. Conta pública confirmada pela página do canal.
- Estado de publicação desta mudança: local, ainda sem commit/push/deploy. Permanecem a URL estável de preview, os segredos limitados a preview e o domínio canônico sem remapeamento.
- Próxima validação: implantar com aprovação, conferir o schema real de create_post e da mídia, adaptar somente o contrato necessário e testar leitura das contas/publicações. Nenhum teste real de publicação está autorizado.

As seções seguintes são históricas e não substituem o estado acima.

# Hospedagem verificada — 13/11/2026

- Repositório: coffeeassessoria/fabrica-viral-gta-vi. Aplicação integrada sem force-push ao pacote editorial já existente (28addb1). Commit de integração: b3593be; a branch preview acompanha a versão de prévia.
- Projeto Vercel vinculado ao GitHub. Deploy de prévia dpl_3z3CZPKHijXqhMNmAtsL5SbRRqYW: READY, URL https://fabrica-viral-gta-hxmsy84ir-vinicius-arenales-projects.vercel.app.
- Verificação HTTPS real: sessão anônima não autenticada, leitura do workspace negada sem login, login com código privado concluído e leitura do banco confirmada. Nenhum registro principal foi alterado nessa verificação.
- Início OAuth real retornou consentimento em app.kairogen.ai e hubpost.co com PKCE S256. Isso valida início do fluxo, não autorização da conta, refresh, geração ou postagem.
- Sessão/código/cookies não foram exibidos. Arquivos temporários de teste HTTP foram removidos. Vercel curl criou uma credencial de bypass de automação do próprio projeto para o teste autenticado; seu valor não foi exibido nem commitado.
- Ocorrência de implantação: a CLI marcou o primeiro deploy sem ambiente explícito como produção. As credenciais de acesso nunca foram enviadas à produção; foi criado em seguida o deploy preview explícito. O primeiro deploy permanece como artefato histórico com login da aplicação indisponível, protegido pela Vercel. O domínio canônico não foi alterado; a revisão automática bloqueou a proposta de remapeá-lo.
- Atualizações seguintes devem usar preview. Não promover produção nem distribuir credenciais entre ambientes sem escopo autorizado.

# Estado atual — banco e hospedagem de prévia

Atualizado em 13/11/2026. A seção do redesign abaixo é histórica; o backend agora existe e usa Neon Postgres.

- Vercel: projeto fabrica-viral-gta-vi criado no time vinicius-arenales-projects; pasta principal vinculada.
- Neon: banco fabrica-viral-db criado no plano gratuito e conectado. Tabelas preparadas para workspace, histórico, conexões protegidas, limites de login e trabalhos.
- Login: configuração dos três segredos aprovada pelo usuário somente para prévia. Nenhum segredo foi impresso ou enviado ao GitHub; produção/desenvolvimento não receberam esses três segredos.
- Banco real: teste passou para salvamento integral, leitura, conflito 409, idempotência de mesma versão, validação 400, origem indevida 403, sessão 401, histórico e criptografia autenticada. Registros de teste isolados foram removidos.
- Navegador real: checklist, calendário, métricas, regra e checklist de setup voltaram após fechar todo o navegador e reiniciar o servidor. Rascunho de edição interrompida foi recuperado e enviado ao banco. Sem erros JavaScript nesse fluxo.
- Build: análise TypeScript e bundle concluídos; aproximadamente 338 kB JS / 102 kB gzip antes de novas revisões. O aviso use-client do lucide-react permanece informativo.
- Integrações: código OAuth/PKCE preparado com metadados públicos confirmados. Autorizações das contas, funções disponíveis e fluxos de geração/postagem ainda não validados com as contas reais. Não chamar de integração concluída antes dessa verificação.
- Geração de texto: implementação de API com consulta de preço e consentimento; nenhuma geração paga foi executada.
- GitHub: primeiro commit/push ainda não executado. Publicação de prévia será registrada após confirmação do deploy e teste do endereço.

Os testes usaram credenciais temporárias somente em memória e WORKSPACE_ID separado. Não alteraram o workspace principal, conexões reais ou conteúdo das redes sociais.

# Validação e entrega — 13/11/2026

## Resultado

Redesign implementado para as oito áreas da Fábrica Viral. Arquivos de interface: `App.tsx` e `index.css`. Mantidos o endpoint relativo `actions`, nomes de coleções, modelo de dados e ações de checklist, calendário, métricas e cronômetro.

Aplicado à pasta original indicada pelo usuário em 13/11/2026. O backup dos dois arquivos originais foi criado antes da substituição; os hashes dos três arquivos entregues foram comparados após a cópia. Destino e backup estão registrados em `aplicacao-local.json`. Nenhum commit, push ou deploy foi executado.

O conteúdo editorial preexistente foi preservado. Removida apenas uma afirmação não verificada sobre preço pessoal de assinatura. O exemplo de MCP foi identificado como não validado. A nova visão geral não apresenta resultados fictícios como se fossem métricas reais.

## Evidências executadas

- `npm run build`: análise TypeScript e bundle Vite concluídos. Bundle JS de aproximadamente 319 kB / 96 kB gzip e CSS de aproximadamente 36 kB / 8 kB gzip, sem fontes externas incluídas nesses tamanhos. O bundler informa aviso sobre diretiva `use client` do lucide-react; não é erro de compilação e esta prévia é uma aplicação cliente.
- Navegador: Microsoft Edge headless com Playwright, 1440×1100 e 390×844; redução de movimento ativada.
- Axe: oito áreas no desktop e oito no celular, tags WCAG 2 A/AA, 2.1 AA e 2.2 AA; zero violações detectadas. Isso não constitui certificação WCAG integral.
- Onze verificações de fluxo concluídas, sem erros JavaScript no navegador. Evidência estruturada em `qa-browser.json`.
- Sorteio de dez ideias, cópia real para clipboard, checklist e restauração após recarga, calendário com título longo/status, métricas atualizando o resumo, cronômetro iniciando/pausando/reiniciando.
- Link de salto por teclado; navegação para título; menu móvel com foco contido, Escape e retorno de foco; oito áreas sem overflow horizontal global em 320px/390px; texto ampliado a 200% nas oito áreas; tipografia fallback na visão geral.
- API simulada exercitou listagem, criação, substituição e falha HTTP 503. Não houve gravação em serviço real, postagem ou geração audiovisual.
- Capturas `preview-desktop.png` e `preview-mobile.png` mostram dados iniciais de demonstração com serviço simulado; não são prova de conexão com o sistema proprietário.

## Limites

O material original contém somente os componentes e o CSS; não inclui implementação do backend, credenciais ou configuração de autenticação. Leitura e salvamento reais precisam de validação no host original. A prévia local informa indisponibilidade quando esse endpoint não existe.

ArtDecoMedium não foi fornecida; fallback Bebas Neue/Impact. As fontes Google precisam de conexão; o fallback de sistema foi exercitado. Não foi realizada sessão manual com leitor de tela, publicação nem teste das integrações mencionadas no conteúdo legado.

O contrato de salvamento original usa quatro operações separadas; não é transacional. A alteração visual não modifica essa propriedade. Os testes usaram fixtures efêmeras e não alteraram dados ou contas reais.

## Retomada

Confira a pasta original e o backup antes de novas alterações. Use `README.md` para executar a cópia de revisão e `DESIGN-SYSTEM.md` como fonte de tokens e comportamento. Uma publicação deve ocorrer somente após autorização explícita do usuário e conferência da API real no ambiente de destino.

## Pasta principal atual
Em 13/11/2026, a pedido do usuário, a interface canônica foi consolidada em fabrica-viral-interface dentro de E:\PROJETOS IA\projeto-fabrica-de-monetizar. Dependências instaladas nessa pasta e npm run build concluído novamente. Arquivos preexistentes preservados em backups/antes-consolidacao-20261113-160536. A pasta outputs da conversa é somente uma cópia histórica.


## Conteúdo de Leonida cadastrado — 13/11/2026

24 itens FV08–FV31 foram adicionados ao workspace principal como Rascunho; FV08, FV12 e FV20 contêm os pilotos completos. Revisão do banco passou de 1 para 2. Importação validada pelo schema, backup privado preservado e releitura integral conferida; demais coleções permaneceram iguais. Não houve geração, aprovação editorial atribuída, agendamento ou postagem. O código não foi alterado.

Consulte [Claude e KAIROGEN: verificação e decisão](docs/pesquisa-2026-11-13/CLAUDE-KAIROGEN-DECISAO.md) para o fluxo atual e a proposta de geração dentro do site. A KAIROGEN documenta suporte MCP geral; o backend atual ainda bloqueia conexão direta e não chama Claude API. OAuth público foi verificado com autorização por código, refresh token e PKCE S256; nenhum contrato autenticado de geração foi validado.


## KAIROGEN direto — atualização local em 13/11/2026

O usuário autorizou integrar a KAIROGEN diretamente. A nova implementação local oferece aprovação editorial vinculada à versão, consulta e confirmação de custo, envio protegido contra repetição e resultados em vídeo no painel. Build, três suítes de testes e teste de navegador passaram com provedor simulado. A prévia hospedada ainda mantém a versão anterior até autorização de publicação. A conta KAIROGEN precisa ser autorizada no painel e seu contrato real validado antes de liberar geração. Nenhum crédito foi consumido.

Consulte [estado e limites da integração direta](docs/KAIROGEN-DIRETO.md). As descrições anteriores de produção exclusivamente pelo Claude registram a fase anterior. O fluxo de importação dos 24 rascunhos já está no banco e permanece disponível na prévia existente.

## Acesso móvel — 13/11/2026

- Usuário autorizou explicitamente retirar o login Vercel somente do alias `fabrica-viral-gta-vi-git-preview-vinicius-arenales-projects.vercel.app`, preservando o código privado da Fábrica.
- Exceção persistente `alias-protection-override` aplicada somente nesse alias; também vale para futuras atualizações desse endereço. A proteção geral do projeto não foi desativada; não houve deploy, promoção, commit ou alteração de segredos.
- Verificação sem cookies: página HTTP 200 sem redirecionamento; `auth.session` retorna `authenticated:false`; `workspace.load` retorna HTTP 401. Dados continuam exigindo autenticação da aplicação.

## Domínio curto — 13/11/2026, configuração parcial

- A pedido do usuário, `fabrica-viral-gta-vi.vercel.app` foi vinculado à branch `preview`. A API confirmou que aponta para `dpl_9JfmqsHPU5rbtTG1jXZBUHs5YJm7`, a mesma versão funcional do alias estável. Não houve novo deploy nem cópia de segredos para produção.
- A tentativa inicial de redirecionar ao alias automático foi recusada pela Vercel sem aplicar o redirecionamento; o vínculo direto à branch foi aceito.
- O domínio curto ainda redireciona ao login da Vercel. A revisão automática bloqueou a exceção de proteção para esse novo alias por exigir autorização específica, solicitada ao usuário e ainda pendente. O alias longo permanece funcional e com sua exceção já autorizada.
- A declaração anterior de domínio canônico não remapeado é histórica: agora o domínio curto acompanha `preview`.

## Domínio curto — acesso concluído em 13/11/2026

- Usuário autorizou explicitamente a exceção persistente de login Vercel também para `fabrica-viral-gta-vi.vercel.app`. Exceção aplicada somente nesse alias; a pendência registrada acima foi resolvida.
- Endereço principal de acesso pelo celular: https://fabrica-viral-gta-vi.vercel.app . Continua vinculado à branch `preview`, com o mesmo código privado e dados, sem replicação de segredos para produção.
- Verificação real: página HTTP 200 sem redirecionamento; consulta anônima ao workspace HTTP 401; login com o código privado existente HTTP 200; cookie de sessão validado; leitura autenticada do workspace HTTP 200. Código, cookies e dados não exibidos. Sessão de teste encerrada.
- Não houve novo deploy, commit ou push. A integração KAIROGEN local não foi publicada por esta mudança de domínio.

## Publicação KAIROGEN autorizada — 13/11/2026

- Usuário autorizou explicitamente commit, push na branch preview e publicação da integração direta no endereço curto atual. Build e três testes npm test reexecutados e aprovados; provedor simulado, sem geração paga.
- O domínio curto está vinculado a preview. A publicação preserva segredos apenas nesse ambiente. Ainda será necessária autorização OAuth da conta e validação das ferramentas reais antes de gerar.


## KAIROGEN — adaptação ao contrato autenticado (13/11/2026)

- Conexão existente confirmada; catálogo real e saldo consultados sem geração. Modelos compatíveis de texto passam a ter formulário próprio. Cotação exige seleção explícita do plano porque a consulta automática de assinatura foi recusada.
- Backend aceita credit_cost, preserva parâmetros de preço e envia expected_credits ao gerar. Roteiro e custo continuam sujeitos à aprovação; nenhuma aprovação real foi inventada.
- Build, quatro testes e navegador com schemas reais/respostas simuladas aprovados; zero violações Axe no fluxo, 390px sem overflow. Primeiro custo/vídeo real ainda dependem da revisão do usuário.
- A atualização inicial foi publicada em dpl_6PTNmNSg32KmvELdX7vVqbSKN3pd; os ajustes posteriores seguem na mesma branch preview. Detalhes e limites atuais em docs/KAIROGEN-DIRETO.md.
