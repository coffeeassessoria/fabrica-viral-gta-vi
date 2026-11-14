# ADR-001 — Métricas e publicação nativas

Status: PROPOSTO · ação futura registrada em 13/11/2026 · responsável pela decisão: Vinícius.

## Contexto e intenção

Reduzir a dependência do HubPost, começando pela leitura direta de métricas do TikTok. Evoluir a publicação por plataforma quando houver elegibilidade, autorização das contas e benefício econômico demonstrável. Este documento registra o pedido; não autoriza publicação, contratação, cancelamento do HubPost ou implantação de novas integrações.

A Fábrica já possui login privado, persistência Neon, conexões criptografadas e revisão de postagem. Na verificação anterior, o HubPost disponibilizou as contas TikTok e YouTube e ferramentas de mídia/postagem, mas não uma ferramenta de analytics de vídeos. A disponibilidade deve ser consultada novamente antes da implementação. KAIROGEN continua no fluxo do Claude: a Fábrica organiza roteiros, recebe vídeos e prepara a distribuição.

## Decisão proposta

Adotar uma transição por capacidades: métricas e publicação são integrações independentes. A conta pode fornecer métricas diretamente ao sistema enquanto a distribuição permanece no HubPost. Só migrar uma capacidade após validação real, sem duplicar postagens nem descartar dados históricos.

| Ordem | Capacidade | Situação | Condição para avançar |
|---|---|---|---|
| 1 | TikTok: perfil e contadores dos próprios vídeos | Futuro prioritário | App/produtos/escopos aprovados e autorização da conta |
| 2 | YouTube: upload e analytics próprios | Futuro proposto | Projeto Google, OAuth e validação das cotas/permissões |
| 3 | TikTok: publicação pública direta | Condicional | Caso de uso elegível e auditoria do TikTok |
| 4 | Instagram e demais redes | Pesquisa posterior | Estudo específico de API, conta, permissões e revisão |

## O que a API do TikTok entrega

O endpoint enviado pelo usuário, `GET /v2/user/info/`, atende dados da conta. `user.info.stats` permite consultar seguidores, contas seguidas, curtidas recebidas e quantidade de vídeos. Perfil e identificação usam permissões próprias. Isso não substitui a consulta de cada vídeo. [Get User Info](https://developers.tiktok.com/docs/en/tiktok-api-v2-get-user-info).

Para os vídeos públicos da conta autorizada, usar `POST /v2/video/list/`, com paginação; atualizar detalhes por `POST /v2/video/query/`, em lotes de até 20 IDs, com `video.list`. Os campos incluem visualizações, curtidas, comentários e compartilhamentos. Os IDs devem ser tratados como strings. [List Videos](https://developers.tiktok.com/docs/en/tiktok-api-v2-video-list), [Query Videos](https://developers.tiktok.com/docs/en/tiktok-api-v2-video-query).

Retenção, tempo assistido, taxa de conclusão, receita e seguidores atribuídos a um vídeo não estão entre esses campos. A interface deve indicar “não disponível nesta fonte”, sem preencher com zero. Esses indicadores podem continuar manuais, identificados por fonte e período. A variação de seguidores da conta não prova que um vídeo trouxe aqueles seguidores.

O acesso depende de cadastro de desenvolvedor, produtos e permissões aprovados e consentimento da conta. Aprovação do produto básico não garante automaticamente todos os escopos adicionais. [Display API: início](https://developers.tiktok.com/docs/en/display-api-get-started).

## O que impede simplesmente reproduzir o HubPost

O obstáculo não é apenas código. A diretriz atual do Direct Post exige um produto destinado a um público amplo e classifica como inadequada uma ferramenta limitada a enviar conteúdo às contas que o próprio desenvolvedor/equipe administra. Esse ponto afeta diretamente o estúdio privado atual. Postagem pública também depende de auditoria; clientes não auditados têm restrições de uso e visibilidade. Não apresentar um produto ficticiamente público para contornar a análise. [Content Sharing Guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines).

A decisão de atender vários criadores seria uma mudança real de negócio e arquitetura: contas independentes, isolamento por organização, suporte, termos, política de privacidade e exclusão de dados. Não faz parte da autorização atual. Se o caso de uso privado continuar, consultar formalmente a elegibilidade e manter o HubPost ou a postagem manual onde a API não atender.

Para um produto elegível, o fluxo futuro deve consultar informações atuais do criador, oferecer as opções permitidas e obter consentimento antes do envio. Publicação é assíncrona: um identificador de envio não comprova vídeo publicado. Verificar o estado final. `PULL_FROM_URL` exige domínio/prefixo verificado; a estratégia de mídia deve seguir as regras vigentes. [Content Posting API](https://developers.tiktok.com/docs/en/content-posting-api-get-started).

## Opções avaliadas

| Opção | Benefício | Limite | Avaliação |
|---|---|---|---|
| Manter somente HubPost | Menos manutenção de integrações | Dependência comercial e cobertura de métricas a confirmar | Continuidade operacional |
| Métricas diretas + HubPost para distribuir | Resolve a prioridade sem aguardar publicação própria | Mantém parte do custo | Caminho inicial recomendado |
| Migrar rede a rede | Controle e redução gradual de dependência | OAuth, revisão, cotas, mídia e suporte próprios | Objetivo posterior |
| Substituir tudo imediatamente | Centralização potencial | Aprovações incertas e risco de interromper o fluxo | Não recomendado |

## Arquitetura proposta

Reaproveitar o backend, autenticação e criptografia existentes. Separar adaptadores `MetricsProvider` e `PublishingProvider`; nenhum componente de cliente deve receber segredos ou refresh tokens. O trabalho de sincronização deve executar no servidor por tarefas duráveis, com estado persistido, limites por conta e tratamento de indisponibilidade. Não depender de a aba do navegador permanecer aberta.

O modelo atual de conexões identificado por provedor é suficiente apenas para o estúdio de um operador. Antes de múltiplos criadores, substituir por chaves e autorizações de workspace + provedor + conta. A estrutura abaixo é proposta, não uma migration já aplicada.

| Entidade proposta | Dados principais | Regra |
|---|---|---|
| social_connections | workspace, provedor, ID externo, escopos, tokens criptografados, validade | Conta só acessível pelo proprietário autorizado |
| social_videos | conta, ID externo, roteiro FV, publicado em, duração, URL | Unicidade por provedor/conta/vídeo |
| account_metric_snapshots | conta, observado em, contadores, fonte | Histórico de observações, sem falsa atribuição |
| video_metric_snapshots | vídeo, observado em, contadores disponíveis, fonte | Não converter contador acumulado em métrica diária sem cálculo explícito |
| social_sync_runs | cursor, início/fim, erro sanitizado, próxima tentativa | Retomada sem perder páginas ou duplicar registros |
| publication_jobs | consentimento, hash da mídia/payload, destino, agenda, ID externo, estado | Uma intenção confirmada não deve gerar dois vídeos |

Preservar as métricas manuais existentes. Uma métrica deve conter plataforma, unidade, fonte, janela e horário de observação. Contadores podem sofrer correções; diferenças negativas não devem ser transformadas artificialmente em crescimento. Falha de sincronização deve mostrar a última atualização bem-sucedida, sem sobrescrever os valores por defaults. Não prometer recuperar séries históricas anteriores à conexão quando o endpoint fornece apenas o total atual.

OAuth deve validar `state`, usar PKCE quando suportado/exigido, restringir callbacks e solicitar o mínimo de permissões. Renovar tokens no servidor, registrar revogação e permitir desconectar/excluir conforme a política definida. Logs não devem conter credenciais. Definir retenção de dados e acesso antes de abrir o produto a terceiros.

Para publicação futura: criar tarefa após revisão explícita de conta, arquivo, legenda, privacidade e horário. Agenda pertence ao servidor; não presumir que toda API oferece agendamento nativo. Após timeouts, reconciliar o envio original antes de tentar novamente. Não trocar automaticamente para HubPost depois de um resultado incerto: isso pode duplicar o vídeo.

## YouTube como segunda etapa

Usar OAuth e `videos.insert`, com upload retomável e revisão dos campos de privacidade, público infantil e conteúdo sintético quando aplicáveis. Verificar documentação e cotas do projeto no momento da execução; não assumir limites antigos nem prometer aprovação. [Videos: insert](https://developers.google.com/youtube/v3/docs/videos/insert), [Data API: início](https://developers.google.com/youtube/data/getting-started).

Analytics do canal pode fornecer indicadores como visualizações, visualizações engajadas, duração média, percentual médio assistido e inscritos, conforme relatório e permissões. Definições e janelas devem permanecer específicas da plataforma. Não somar métricas de nomes parecidos como se fossem equivalentes. [YouTube Analytics: métricas](https://developers.google.com/youtube/analytics/metrics).

## Plano de execução e critérios de saída

1. **NAT-01 — viabilidade e economia.** Conferir contrato/fatura e cobertura atual do HubPost; validar caso de uso TikTok, produtos e escopos. Saída: matriz de capacidades e custo baseada em dados reais. Sem cancelar serviço.
2. **NAT-02 — TikTok somente leitura.** Preparar app, callback estável, autorização e vínculo da conta. Sincronizar perfil/vídeos e salvar snapshots. Saída: valores comparados a respostas reais da API, paginação completa, revogação tratada e nenhum endpoint de postagem acionado.
3. **NAT-03 — painel de métricas.** Exibir origem, última atualização, indisponível versus zero e relação com o roteiro. Saída: dados manuais preservados, isolamento por conta e filtros coerentes.
4. **NAT-04 — YouTube nativo.** Preparar upload, estado de processamento e analytics. Saída: teste real com vídeo e privacidade especificamente autorizados; nenhum envio em teste automatizado comum.
5. **NAT-05 — decisão TikTok Direct Post.** Só iniciar após elegibilidade confirmada. Preparar experiência exigida e auditoria. Saída: aprovação e validação de processamento/publicação; enquanto pendente, manter distribuição existente.
6. **NAT-06 — migração gradual.** Comparar custos e confiabilidade, escolher provedor por destino e reconciliar IDs. Saída: uma capacidade migrada sem postagem duplicada ou perda de histórico. Cancelamento do HubPost exige decisão posterior.

Sem prazo ou economia numérica prometidos: desenvolvimento, revisão de plataforma e infraestrutura ainda precisam ser dimensionados. Equação de avaliação: mensalidade evitada menos infraestrutura incremental, operação/manutenção e desenvolvimento amortizado. Armazenamento, tráfego de vídeo, tarefas de servidor e suporte continuam existindo.

## Verificações futuras

- OAuth inválido/expirado/revogado não deve liberar dados de outra conta.
- Paginação, limite 429, backoff e retomada devem ser testados com respostas simuladas; comparação real só com conta autorizada.
- Um erro de rede não deve apagar histórico ou indicar uma publicação concluída.
- Repetir uma intenção de postagem deve preservar a mesma tarefa; falha incerta exige reconciliação.
- “0” deve significar valor real retornado; campo ausente deve exibir indisponibilidade.
- Crescimento da conta não deve ser apresentado como aquisição por vídeo.
- Testes não devem publicar, gerar vídeo pago ou gastar créditos sem autorização específica.

## Consequências e pendências

O modo híbrido reduz o risco de interromper a operação e permite validar métricas primeiro. Em troca, mantém a mensalidade durante a transição e acrescenta manutenção própria. A principal pendência é elegibilidade do Direct Post para o modelo real da Fábrica; a segunda é dimensionar a economia com custos efetivos. Nenhuma implementação ou aprovação externa é declarada por este ADR.
