# Fábrica Viral — estúdio web

Painel React/Vite com acesso privado, banco Neon Postgres, salvamento automático e conexão autorizada aos provedores KAIROGEN e HubPost. A pasta canônica é `E:\PROJETOS IA\projeto-fabrica-de-monetizar\fabrica-viral-interface`.

## O que já funciona

- Login por código privado; hash de senha no servidor, cookie HttpOnly e limite de tentativas.
- Checklist, checklist de setup, calendário, métricas e regra da semana salvos juntos no banco, automaticamente após a edição.
- Rascunho no navegador para recuperar alterações ainda não enviadas. Conflitos entre abas não sobrescrevem versões mais recentes.
- Histórico das cem revisões anteriores de cada workspace e exportação JSON pelo botão de backup.
- Páginas de produção de roteiros, conexões e mídia/postagem. Geração e publicação só são enviadas após confirmação no painel.

## Integrações: limites reais

KAIROGEN e HubPost exigem autorização individual. A página Integrações inicia OAuth com PKCE; tokens ficam criptografados no banco, nunca no navegador ou no GitHub. A verificação consulta as ferramentas realmente expostas por cada conta. Recursos ausentes ou schemas ainda não suportados permanecem bloqueados, sem simular sucesso.

O HubPost informa que algumas ferramentas de escrita, mídia e analytics estão em liberação; o resultado real da conexão prevalece sobre a página comercial. Criar uma conta não autoriza o painel automaticamente. Consulte [HubPost MCP](https://hubpost.co/mcp) e [API](https://hubpost.co/docs).

Roteiros pela interface usam Vercel AI Gateway. Consomem créditos de API separados das assinaturas de ChatGPT/Claude. O custo é consultado antes de cada geração; nenhum teste pago foi executado nesta preparação. Operações de vídeo e postagem dependem das funções confirmadas pelo provedor e da aprovação do usuário.

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
