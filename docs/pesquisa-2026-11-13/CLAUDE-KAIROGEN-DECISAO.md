# Claude e KAIROGEN na Fábrica — verificação e decisão proposta

13/11/2026. Conteúdo cadastrado; geração integrada ainda não implementada.

## O que foi entregue agora

Foram adicionados 24 registros FV08–FV31 ao workspace principal da Fábrica, como Rascunho. Os pilotos completos de 36 segundos estão dentro de FV08, FV12 e FV20, sem criar duplicatas das ideias correspondentes. Títulos distinguem IDEIA e PILOTO. As outras 21 propostas precisam ser desenvolvidas em roteiros antes da geração.

Importação validada pelo mesmo schema do backend, com backup privado, revisão otimista e releitura do banco. Revisão passou de 1 para 2; havia zero registros de produção no workspace consultado. Checklist, calendário, métricas e regra permaneceram iguais. O pacote histórico FV01–FV07 continua nos arquivos do projeto. Os dias dos novos itens são sugestões de organização, não agendamentos. Nenhuma aprovação foi atribuída ao usuário.

## Como revisar na interface atual

Abrir Produção, localizar os títulos PILOTO FV08, PILOTO FV12 e PILOTO FV20, ler e editar os campos. Os demais títulos IDEIA identificam premissas em desenvolvimento. Manter Rascunho enquanto houver ajustes; após a revisão, marcar Roteiro pronto. A etapa Aprovado também existe no fluxo genérico atual, mas não há ainda aprovação de orçamento de geração no site.

Para usar o Claude hoje, copiar o pacote individual somente depois da revisão. O botão de download global da versão atual inclui todos os itens, inclusive rascunhos: não usá-lo como uma fila automática de aprovação. O pacote solicita confirmação do custo antes de geração paga. Registrar depois o link HTTPS do vídeo recebido. Essa operação atual ainda exige alternar entre a Fábrica e o Claude.

Se uma aba antiga mostrar conflito, baixar o rascunho antes de carregar a versão salva. Não apagar dados do navegador para tentar forçar a importação.

## Evidências verificadas

1. No código atual, `StudioProduction.tsx` exporta Markdown; não chama Claude API. `server/integrations.ts` aceita HubPost e retorna 410 para KAIROGEN. Portanto não existe uma geração automática Claude/KAIROGEN ativa na Fábrica.
2. A página oficial da KAIROGEN informa suporte a clientes MCP compatíveis, não exclusividade do Claude. O endpoint publicado é `https://mcp.kairogen.ai/mcp`. [KAIROGEN MCP](https://kairogen.ai/mcp).
3. A consulta HTTP real ao documento público de recurso protegido retornou a autoridade `https://api.kairogen.ai` e escopos como `kairogen:read` e `kairogen:generate`. Isso comprova descoberta OAuth pública, não login da conta nem capacidade de uma ferramenta específica. [Metadados públicos](https://mcp.kairogen.ai/.well-known/oauth-protected-resource).
4. A API do Claude suporta chamadas a MCP remoto HTTP e tokens OAuth fornecidos pela aplicação. Não herda automaticamente a sessão/conexão criada no aplicativo Claude. O backend precisa administrar autorização e credenciais próprias. [Claude MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector).
5. Claude no aplicativo e consumo da API têm faturamento separado. Eventuais créditos promocionais de assinantes devem ser conferidos na conta; não presumir saldo nem gratuidade. [Faturamento](https://support.claude.com/en/articles/9876003-why-is-claude-api-usage-billed-separately-from-my-paid-claude-plan).

Não foram consultados saldo ou catálogo autenticado da KAIROGEN, nem executadas ferramentas de geração. Um repositório público mencionado por resultados de busca retornou 404; não foi usado como prova de nomes ou schemas de ferramentas. O contrato real deve vir de `tools/list` após autorização válida.

## Melhor opção para funcionar inteiramente no site

Recomendação: a Fábrica deve controlar a fila de produção e conectar seu backend diretamente ao MCP da KAIROGEN. Claude via API pode ser o planejador de cenas, quando houver necessidade. Roteiros já detalhados não precisam de uma conversa adicional com um modelo para cada consulta de status ou envio de take.

Fluxo proposto:

1. Revisar e aprovar uma versão exata do roteiro na Fábrica.
2. Preparar plano de takes e referências. Usar Claude API opcionalmente para transformar o roteiro em plano estruturado; revisar esse plano.
3. Consultar catálogo, limites, saldo e custo pelos recursos realmente disponíveis na KAIROGEN. Se não houver cotação confiável, interromper o envio e solicitar revisão da estimativa.
4. Exibir modelo, duração, resolução, número de takes e teto de créditos. O usuário confirma esse conjunto, separado da aprovação editorial.
5. Uma tarefa persistida no servidor envia as gerações autorizadas e acompanha os IDs devolvidos, mesmo com a página fechada.
6. O resultado volta para o item correspondente: takes, vídeo montado se o serviço oferecer essa capacidade, erros e custos conhecidos. Não confundir um take concluído com uma novelinha final montada.
7. O usuário revisa o vídeo e só então autoriza distribuição pelo HubPost. Aprovação do roteiro ou da geração não autoriza postagem.

Essa arquitetura atende ao objetivo de operar pelo navegador. Evita depender de um computador ligado ou de automação da interface do Claude. Pode usar Claude para o trabalho criativo sem entregar ao modelo liberdade irrestrita para gastar créditos ou publicar.

## Alternativas e custo

| Opção | Experiência | Avaliação |
|---|---|---|
| Pacote individual para Claude + KAIROGEN conectada no Claude | Revisão no site, geração na conversa e retorno manual | Disponível agora; menor implementação |
| MCP da própria Fábrica conectado ao Claude, junto da KAIROGEN | Claude busca aprovados e devolve links pela conversa | Reduz cópia manual, mas continua dependente do Claude aberto pelo usuário |
| Backend Fábrica + KAIROGEN MCP + Claude API opcional | Revisão, orçamento, geração e acompanhamento no site | Recomendado para a ferramenta autônoma |
| Controlar cliques do Claude a partir do site | Depende de sessão, interface e computador | Não recomendado como base operacional |

Custos continuam separados: créditos de mídia na KAIROGEN; uso da API do Claude quando acionada; armazenamento, transferência e execução de tarefas. Não há preço estimado neste documento porque saldo, modelos, resolução e plano real ainda não foram consultados.

## Implementação necessária

- Reintroduzir KAIROGEN como provedor permitido, com OAuth próprio da Fábrica, callback estável, renovação e tokens criptografados. Não tentar reutilizar cookies da conta Claude.
- Descobrir o contrato autenticado de ferramentas. Permitir somente leitura inicialmente; habilitar geração após revisão dos schemas e de como custos são apresentados.
- Adicionar aprovação editorial explícita com versão/hash, pessoa e horário; editar conteúdo relevante deve invalidar a aprovação. Exportação por padrão deve conter apenas aprovados.
- Aprovação financeira deve incluir plano/modelo/parâmetros e limite autorizado. A autorização de uma versão não vale para regenerações ilimitadas.
- Criar trabalhos duráveis por roteiro/take, com estados propostos: aguardando orçamento, aguardando confirmação, enviado, processando, concluído, falhou e resultado incerto.
- Persistir ID externo antes de polling; diante de timeout incerto, reconciliar o trabalho original antes de reenviar. Idempotência externa só pode ser presumida se documentada pelo provedor.
- Separar cotação, envio, acompanhamento e distribuição em operações restritas. O modelo não recebe ferramentas de faturamento ou postagem por padrão.
- Verificar entrega de áudio, legendas, continuidade, edição e montagem. Se KAIROGEN só entregar cenas, prever montagem própria ou etapa assistida antes de marcar vídeo final.
- Guardar resultados em armazenamento autorizado quando links expiram, com controle de acesso; não expor tokens ou URLs com credenciais nos roteiros.

## Ordem de execução recomendada

Primeiro: revisão dos três pilotos já cadastrados. Depois: conexão OAuth da KAIROGEN com a Fábrica e inspeção autenticada somente de leitura. Em seguida: orçamento de um único piloto e aprovação explícita dos créditos. Só então implementar/validar o ciclo completo e expandir para lotes.

Critérios de aceite: roteiro reeditado perde aprovação; rascunho não gera; orçamento não confirmado não gera; fechar a aba não perde trabalho; falha de rede não duplica cobrança; resultado mantém ID do roteiro; postagem continua exigindo confirmação separada. Testes automatizados usam provedor simulado; teste pago real exige autorização específica.

Esta rodada não altera o código publicado, não ativa API faturada e não gera vídeos. O cadastro no banco já está disponível para revisão na versão atual da plataforma.
