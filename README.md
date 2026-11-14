# Fábrica Viral — estúdio web

Painel React/Vite com acesso privado, banco Neon Postgres, salvamento automático e geração direta de cenas pela KAIROGEN sob aprovação de roteiro/custo e conexão autorizada ao HubPost. A pasta canônica é `E:\PROJETOS IA\projeto-fabrica-de-monetizar\fabrica-viral-interface`.

## O que já funciona

- Login por código privado; hash de senha no servidor, cookie HttpOnly e limite de tentativas.
- Checklist, checklist de setup, calendário, métricas e regra da semana salvos juntos no banco, automaticamente após a edição.
- Rascunho no navegador para recuperar alterações ainda não enviadas. Conflitos entre abas não sobrescrevem versões mais recentes.
- Histórico das cem revisões anteriores de cada workspace e exportação JSON pelo botão de backup.
- Mesa de produção com roteiros editáveis, importação opcional do pacote FV01–FV07, exportação Markdown para o Claude e registro dos links dos vídeos recebidos. Os roteiros também são salvos no workspace.
- Área de distribuição com conta, vídeo, legenda, modalidade, revisão e consentimento por envio. A repetição da mesma confirmação reutiliza o ID para evitar postagem duplicada.

## Integrações: limites reais

A integração direta KAIROGEN está publicada na prévia. O usuário aprova o roteiro e consulta/confirma o custo antes do envio. O contrato autenticado está em validação: campos ou respostas incompatíveis bloqueiam a geração. Exportação para o Claude continua disponível como alternativa. Nenhuma geração paga foi realizada na implantação.

KAIROGEN e HubPost usam OAuth com PKCE nesta interface. Tokens ficam criptografados no banco, nunca no navegador ou no GitHub. Recursos ausentes ou schemas ainda não suportados permanecem bloqueados, sem simular sucesso. A lista real da conta, consultada em 13/11/2026, expõe create_post e ferramentas de mídia, mas não get_analytics. TikTok @gtavi1000grau e YouTube @fabricaviralgtavi1000grau foram encontrados nas contas conectadas. Isso não comprova publicação de vídeo nem sincronização de métricas.

O HubPost informa que algumas ferramentas de escrita, mídia e analytics estão em liberação; o resultado real da conexão prevalece sobre a página comercial. Criar uma conta não autoriza o painel automaticamente. Consulte [HubPost MCP](https://hubpost.co/mcp) e [API](https://hubpost.co/docs).

As rotas antigas de geração pelo AI Gateway retornam 410. O histórico de trabalhos anteriores foi preservado. O pacote para o Claude exige consulta de custo e aprovação antes de qualquer geração paga. A área de métricas informa a origem manual dos registros. A consulta direta ao TikTok exigiria outro aplicativo e autorização, ainda não configurados.

A publicação recebe somente argumentos compatíveis com o schema exposto pela conexão. Conta, legenda, mídia e modalidade precisam ser mapeados; campos adicionais obrigatórios sem adaptador bloqueiam o envio. O contrato real desta conta usa mediaIds da biblioteca. A interface consulta vídeos e oferece upload direto do arquivo para o endereço assinado pelo HubPost, seguido da confirmação da biblioteca; nenhum arquivo passa pelo disco da Vercel. Publicação imediata usa uma data já vencida, conforme descrito pelo próprio schema. Rascunho omite a data e agendamento exige data futura. As opções de TikTok/YouTube ficam explícitas na revisão. Uma chamada aceita pelo HubPost não equivale à confirmação de publicação na rede; consulte o histórico. Não houve postagem real nesta preparação.

## Ambiente

Requisitos: Node 24 e npm. Variáveis de servidor: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD_HASH` e `TOKEN_ENCRYPTION_KEY`. `APP_ORIGIN` é opcional para uma URL estável de callback. Nomes de variáveis não são credenciais.

```powershell
npm ci
npm run db:migrate
npm run dev
```

Para a Vercel, as mesmas funções ficam em `api/`; dados não dependem do disco efêmero da hospedagem. O endpoint legado `/actions` é redirecionado para `/api/actions`. A leitura das coleções existentes foi preservada; o salvamento novo usa `workspace.save` integral com revisão.

As credenciais de login e criptografia foram autorizadas somente para a prévia. Produção e desenvolvimento não receberam essas credenciais. O código inicial foi guardado fora do repositório, na pasta `.private` do projeto principal; não envie esse arquivo ao GitHub.

## Verificação

- `npm run build`: TypeScript e bundle.
- `npm test`: banco real em registros isolados, sessão, validação, conflito, histórico e criptografia; remove somente os registros de teste.
- `node --env-file=.env.local tests/persistence-browser.mjs`: navegador real fecha e reabre, reinicia servidor e recupera rascunho. Requer Playwright instalado no ambiente de teste.

Os testes usam valores de login temporários em memória, sem enviá-los à Vercel. Nenhuma postagem ou geração paga ocorre nos testes. Veja `VALIDACAO.md` para o estado atual; as capturas antigas são do redesign anterior à autenticação.

## Segurança e operação

Não commitar `.env*`, `.vercel`, backups, perfis de navegador ou arquivos privados. O banco novo foi criado para este projeto; não reutilizar credenciais de outros clientes. Não expor o servidor local à rede pública. Login é de operador único nesta versão; múltiplos usuários exigem autorização por workspace antes de ampliar o acesso.

Se aparecer “rascunho preservado”, não limpe os dados do navegador antes de reconectar ou baixar um backup. O salvamento no banco continua disponível após fechar o navegador ou reiniciar a hospedagem. O rascunho depende do mesmo navegador e endereço.

## Pacote editorial preservado

As cinco pastas `01-ideias` a `05-metricas`, os sete roteiros e o calendário originais foram preservados do commit 28addb1. Consulte [PACOTE-EDITORIAL.md](PACOTE-EDITORIAL.md) para o registro dessa entrega. A publicação da aplicação não equivale à aprovação ou postagem das histórias.

## Prévia hospedada

Endereço estável da branch: https://fabrica-viral-gta-vi-git-preview-vinicius-arenales-projects.vercel.app

O usuário aprovou commit/push e atualização somente da prévia. A primeira etapa foi enviada em a61aa31, deployment dpl_HUtr71f3ZCa4z5uwiGm8oTrCjoDU, READY. A adaptação final do contrato foi enviada em 81a11d6, com deploy de prévia READY. Consultas hospedadas confirmaram biblioteca, histórico e preparação de upload. Nenhum vídeo foi enviado ou publicado; confira VALIDACAO.md para evidências e limites.

O projeto está conectado ao repositório coffeeassessoria/fabrica-viral-gta-vi. Trabalhar na branch `preview` para não gerar uma publicação de produção ao atualizar `main`. Para deploy manual, usar explicitamente `vercel deploy --environment preview`; a CLI marcou o primeiro deploy sem esse argumento como produção automaticamente.

O deploy explícito de prévia ficou READY. Login e leitura protegida do banco foram verificados na função hospedada. Os dois provedores retornaram autorização OAuth com PKCE S256; a autorização das contas pelo usuário ainda é necessária. Não houve geração paga nem postagem de teste.

O domínio canônico não foi remapeado: a revisão automática bloqueou essa mudança de roteamento e foi usada a URL exclusiva de prévia. Há também a proteção de acesso da própria Vercel; o usuário pode precisar entrar na sua conta Vercel antes de acessar o login do estúdio.

## Canal do projeto

Canal criado com autorização explícita do usuário: [Fábrica Viral GTA VI 1000 Grau](https://www.youtube.com/channel/UCV92NvRghmpRW54P0zjrB2g), identificador @FabricaViralGTAVI1000Grau. Nenhum vídeo foi enviado durante a criação. Avatar, capa e descrição ainda não foram personalizados.

No HubPost, clique em Carregar contas e Carregar vídeos. Se necessário, selecione um MP4/WebM/MOV e use Enviar arquivo para o HubPost. Depois escolha conta, vídeo, legenda, opções da plataforma e modalidade. Revise e confirme. Nenhum envio é automático ao selecionar arquivo ou preencher o formulário. Upload real e publicação final precisam ser validados com um vídeo aprovado; os testes automatizados não enviam mídia real.

<!-- pesquisa-leonida-2026-11-13 -->
## Planejamento futuro e pesquisa editorial — 13/11/2026

Consulte [Próximas ações](docs/pesquisa-2026-11-13/PROXIMAS-ACOES.md): métricas diretas do TikTok como prioridade; YouTube nativo como etapa proposta; Direct Post do TikTok condicionado à elegibilidade e auditoria. O [Atlas de Leonida](docs/pesquisa-2026-11-13/ATLAS-LEONIDA.md) e o [banco FV08–FV31](docs/pesquisa-2026-11-13/BANCO-LEONIDA-FV08-FV31.md) são pesquisa e rascunhos autorais. Nenhuma dessas integrações foi implementada e nenhum roteiro novo foi importado no workspace automaticamente.


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
