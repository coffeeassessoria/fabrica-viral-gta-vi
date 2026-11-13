# Fábrica Viral — aplicação web

- Ler o AGENTS.md do diretório pai quando disponível. Esta é a interface canônica; não editar cópias antigas em outputs.
- Preservar o design em DESIGN-SYSTEM.md. Manter tipos e nomes das coleções existentes; salvamento integral usa revisão otimista no banco Neon.
- API em `api/` e `server/`; cliente não pode importar módulos de servidor ou expor variáveis secretas.
- Validar o workspace completo antes de salvar. Nunca substituir dados por defaults após erro de leitura. Preservar rascunhos e rejeitar conflitos.
- Tokens OAuth são criptografados com chave de servidor. Não imprimir códigos de acesso, tokens, cookies ou URLs com credenciais.
- Operações externas de geração/agendamento precisam de confirmação dentro do produto. Nenhum teste pode publicar ou gastar créditos sem autorização específica.
- `npm run build` e `npm test` devem passar. Testes reais de persistência usam WORKSPACE_ID isolado e limpam somente esse workspace; nunca limpar dados principais.
- Deploy inicial é de prévia. Credenciais de acesso foram autorizadas apenas para prévia; não replicar em produção/desenvolvimento sem novo escopo autorizado.
- Não commitar, dar push ou publicar sem confirmação explícita do usuário. Atualizar README e VALIDACAO quando o estado real mudar.
