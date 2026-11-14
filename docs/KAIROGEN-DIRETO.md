# KAIROGEN direto — integração na prévia

Atualização em 13/11/2026. Publicação autorizada pelo usuário na branch preview. Endereço: https://fabrica-viral-gta-vi.vercel.app . Nenhuma geração paga foi executada nesta implantação.

## Fluxo

1. Salvar e aprovar uma versão do roteiro na Mesa de produção.
2. Preparar uma cena, selecionar um modelo do catálogo real e seu plano atual KAIROGEN.
3. Conferir duração, formato e opções do modelo; consultar o custo em créditos.
4. Revisar os parâmetros e o custo, marcar consentimento e confirmar um envio.
5. Acompanhar o processamento e o resultado no player do painel. Associar o vídeo ao roteiro quando estiver pronto.

A versão atual oferece geração a partir de texto. Modelos que exigem arquivos de referência ficam fora da seleção; envio de imagens, edição de vídeo e montagem automática do episódio não fazem parte desta etapa. Cada confirmação gera um take, quantidade 1. Não requer assinatura ou API do Claude.

## Conexão e contrato reais

A conexão OAuth KAIROGEN já existente foi validada por leitura autenticada em 13/11/2026. Foram consultados tools/list, list_models e get_credits; o catálogo respondeu com 22 modelos, dos quais o adaptador oferece apenas modalidades de texto compatíveis. O painel usa nomes, durações e opções desse catálogo, sem preços fixos inventados.

Os schemas reais confirmam estimate_cost, generate_video e get_generation. A cotação exige plan_key e o custo usa credit_cost; a geração admite expected_credits para rejeitar cobrança diferente. O backend envia o limite aprovado e força wait_for_completion=false. Parâmetros específicos do modelo são enviados igualmente na cotação e geração por extra_params.

A consulta automática get_subscription_status foi recusada pelo provedor. Ela foi removida do fluxo. O usuário seleciona seu plano atual entre as opções anunciadas pelo schema da cotação; isso não altera assinatura nem compra créditos. O plano fica registrado e visível na revisão. Selecionar um plano incorreto pode causar rejeição do envio pelo limite de créditos.

## Aprovação e segurança

Tokens OAuth criptografados, login privado e segredos apenas no ambiente preview. Roteiro aprovado é vinculado ao conteúdo salvo; editar invalida a aprovação. Cotação tem validade de dez minutos. No envio, o servidor confere novamente aprovação, contrato e custo. A mesma cotação é consumida uma única vez, inclusive com dois cliques concorrentes.

Resultados sem confirmação ficam incertos, sem reenvio automático. O operador deve consultar o provedor antes de tentar outra geração desse roteiro. Uma conexão autorizada não permite gasto sem confirmação de custo no painel. Publicação social permanece separada.

## Resultados e limites

Histórico e cotações ficam no banco. Enquanto o painel está aberto e visível, ele consulta trabalhos em processamento a cada 15 segundos. Após reabrir, recupera o histórico e permite atualização manual. O processamento assíncrono aceito continua no provedor; não existe um worker de montagem próprio.

Os players usam links HTTPS retornados pela KAIROGEN. Armazenamento permanente próprio dos arquivos ainda não foi implementado; links podem expirar. A geração e o retorno de um primeiro vídeo real dependem da aprovação do usuário e ainda não foram validados nesta implantação.

## Verificação

- Build TypeScript/Vite aprovado.
- Quatro testes aprovados: persistência/autenticação, aprovação/custo/idempotência, publicação HubPost e catálogo/contrato KAIROGEN.
- Fixtures de schemas e catálogo derivadas da leitura autenticada; preços e vídeos dos testes são simulados.
- Navegador: modelo/plano, aprovação antes do custo, consentimento antes do envio, vídeo simulado recuperado após recarregar e edição invalidando aprovação.
- Axe: zero violações no fluxo testado; largura 390px sem overflow horizontal. Não é certificação integral do site.
- Nenhum roteiro real foi aprovado ou alterado pelos testes. Nenhum crédito foi gasto e nenhum vídeo foi publicado.

Fontes técnicas: https://kairogen.ai/mcp e schemas do MCP autenticado https://mcp.kairogen.ai/mcp .
