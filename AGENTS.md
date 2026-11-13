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

## Conteúdo editorial preservado

- `01-ideias/`, `02-roteiros/`, `03-videos/`, `04-postagem/` e `05-metricas/` mantêm o pacote FV01–FV07 anterior à aplicação. `PACOTE-EDITORIAL.md` preserva seu README histórico.
- Histórias e personagens são fictícios. Não apresentar ficção como notícia, vazamento, gameplay ou informação oficial de GTA VI.
- Não copiar missões, personagens, cenas, mapas, músicas, logotipos ou gameplay. A inspiração é o gênero e a atmosfera urbana.
- Não inventar métricas, desempenho, aprovações, orçamentos ou capacidades de serviços. Separar roteiros/prompt preparados de vídeos realmente gerados.
- Manter IDs FV01–FV07 alinhados entre catálogo, roteiros, calendário e métricas. Não declarar resultado de votação sem apuração real.
- Aprovação editorial é diferente de autorização para postagem. Nenhuma integração autoriza postagem por conta própria.
