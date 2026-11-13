# Fábrica Viral — estúdio web

Painel React/Vite com acesso privado, banco Neon Postgres, salvamento automático e produção de vídeo externa pelo Claude com KAIROGEN e conexão autorizada ao HubPost. A pasta canônica é `E:\PROJETOS IA\projeto-fabrica-de-monetizar\fabrica-viral-interface`.

## O que já funciona

- Login por código privado; hash de senha no servidor, cookie HttpOnly e limite de tentativas.
- Checklist, checklist de setup, calendário, métricas e regra da semana salvos juntos no banco, automaticamente após a edição.
- Rascunho no navegador para recuperar alterações ainda não enviadas. Conflitos entre abas não sobrescrevem versões mais recentes.
- Histórico das cem revisões anteriores de cada workspace e exportação JSON pelo botão de backup.
- Mesa de produção com roteiros editáveis, importação opcional do pacote FV01–FV07, exportação Markdown para o Claude e registro dos links dos vídeos recebidos. Os roteiros também são salvos no workspace.
- Área de distribuição com conta, vídeo, legenda, modalidade, revisão e consentimento por envio. A repetição da mesma confirmação reutiliza o ID para evitar postagem duplicada.

## Integrações: limites reais

O usuário definiu que os roteiros são preparados na conversa, e o Claude usa sua própria conexão KAIROGEN para gerar os vídeos. A Fábrica organiza e exporta os roteiros; não oferece conexão direta ou geração paga pela KAIROGEN.

Somente o HubPost usa OAuth com PKCE nesta interface. Tokens ficam criptografados no banco, nunca no navegador ou no GitHub. Recursos ausentes ou schemas ainda não suportados permanecem bloqueados, sem simular sucesso. A lista real da conta, consultada em 13/11/2026, expõe create_post e ferramentas de mídia, mas não get_analytics. TikTok @gtavi1000grau e YouTube @fabricaviralgtavi1000grau foram encontrados nas contas conectadas. Isso não comprova publicação de vídeo nem sincronização de métricas.

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
