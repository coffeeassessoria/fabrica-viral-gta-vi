# KAIROGEN direto — implementação local

Status em 13/11/2026: código preparado e testes simulados aprovados; publicação de prévia e validação autenticada pendentes. Nenhuma geração real executada.

## Decisão

Integração direta do backend com o MCP da KAIROGEN, autorizada por Vinícius. Claude API não é necessário para enviar uma cena já preparada; não foi ativado serviço adicional faturado. A conta autoriza OAuth com PKCE, tokens criptografados e permissões de leitura/geração. Conectar não autoriza gasto.

## Fluxo implementado

1. Editar e salvar o roteiro na Mesa de produção.
2. Selecionar o roteiro no painel de geração e aprovar a versão exata. Etapas antigas como Roteiro pronto não equivalem a esta aprovação.
3. Preparar uma cena e consultar custo em créditos.
4. Revisar parâmetros, custo e validade de dez minutos; marcar consentimento e confirmar.
5. O servidor confere novamente aprovação, contrato e custo antes de reservar o envio. Mudança exige nova revisão.
6. A KAIROGEN processa o trabalho aceito. O painel consulta trabalhos em andamento a cada 15 segundos enquanto visível e permite consulta manual ao retornar.
7. Vídeos recebidos aparecem no player. Usar como vídeo recebido associa o link ao roteiro pelo salvamento normal do workspace. Distribuição continua separada.

Cada envio é uma cena conforme duração e modelo escolhidos. Não há promessa de montar automaticamente um episódio inteiro a partir de um roteiro de 36 segundos. Os takes podem exigir montagem posterior. Links de resultados são os fornecidos pelo serviço; armazenamento permanente próprio não foi implantado.

## Proteções

Aprovação vinculada ao conteúdo salvo; edições invalidam o vínculo. Cotações e jobs são persistidos em tabelas próprias, com workspace, roteiro, parâmetros e custo. Confirmação de uma cotação é consumida uma única vez por transição atômica. Timeout ou resposta sem ID fica incerto e não é reenviado automaticamente. Enquanto houver resultado incerto/em andamento, outra cotação para o mesmo roteiro é bloqueada. Isso é prevenção de duplicidade, não garantia de estorno do provedor.

Os parâmetros são validados pelo JSON Schema anunciado no MCP. Contratos sem cotação, vídeo assíncrono e consulta compatíveis são recusados. A cotação precisa representar os parâmetros relevantes enviados. Respostas livres não são interpretadas como preço. URLs de vídeo precisam usar HTTPS e não conter usuário/senha.

## Limite de validação real

A descoberta OAuth pública foi verificada: autorização por código, refresh e PKCE S256. Inicialização anônima do MCP retornou 401. A autorização da conta no painel ainda é necessária para conhecer os schemas reais.

O adaptador inicial espera ferramentas estimate_cost, generate_video e get_generation, com entradas escalares, prompt e wait_for_completion=false. Esses nomes estavam no histórico do projeto; não foram confirmados na conta autenticada nesta rodada. Campos de custo aceitos são créditos explícitos; respostas diferentes bloqueiam a geração até adaptação. Não chamar testes com fixture de validação do provedor.

A interface apresenta campos anunciados pelo contrato, não modelos ou preços inventados. Caso o modelo venha como texto livre em vez de enumeração, será necessário adaptar o catálogo autenticado para oferecer seleção amigável antes do uso real.

## Verificação realizada

- Build TypeScript/Vite aprovado; avisos existentes de diretivas de lucide-react sem falha de build.
- Três suítes npm test aprovadas, incluindo banco real isolado e provedor simulado.
- Testes cobrem falta de aprovação, roteiro não salvo/alterado, custo alterado, confirmação ausente, envio concorrente, revogação, timeout, isolamento e recuperação do resultado.
- Navegador real de teste: aprovar, cotar, confirmar uma vez, receber vídeo simulado, recarregar e invalidar aprovação após edição. Sem chamada externa de geração.
- Axe: zero violações detectadas no fluxo testado. Viewport 390px sem overflow horizontal. Não é certificação integral de acessibilidade.
- Tabelas novas criadas de forma aditiva durante preparação/testes; somente workspaces de teste foram removidos. Os 24 rascunhos reais não foram editados.

## Publicação e próxima validação

Commit/push na branch preview e publicação apenas na prévia Vercel autorizados explicitamente pelo usuário em 13/11/2026. Publicação em preparação. Depois autorizar KAIROGEN na área Integrações, consultar tools/list e adaptar o contrato real quando necessário. Validar leitura/cotação antes de solicitar aprovação de qualquer geração paga. Não configurar credenciais de produção.

Prévia existente: https://fabrica-viral-gta-vi-git-preview-vinicius-arenales-projects.vercel.app

Fontes: https://kairogen.ai/mcp e https://mcp.kairogen.ai/.well-known/oauth-protected-resource.
