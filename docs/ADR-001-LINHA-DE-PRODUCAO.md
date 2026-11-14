# ADR-001: Produção por episódio com orçamento único

**Status:** Accepted — implementação na prévia autorizada; validação hospedada registrada em VALIDACAO.md.
**Date:** 2026-11-13
**Deciders:** Vinícius (fluxo e autorização de gasto no produto); implementação técnica pelo assistente.

## Contexto

O operador não conseguiu acompanhar a geração no fluxo anterior. Havia aprovação de roteiro, modelo, plano, cena, cotação e confirmação repetidos para cada take, além de 24 editores abertos. O navegador era responsável pelo acompanhamento. Uma cena FV08 já foi aceita pelo provedor; ela deve ser consultada, nunca reenviada como teste.

## Decisão

Uma produção preserva uma versão do roteiro, parâmetros e cotação de todas as cenas. O operador confirma o roteiro e o total uma vez. Cada cena tem um job próprio no banco; uma fila durável processa uma etapa por entrega, mesmo sem navegador aberto. A etapa final exige revisão humana das cenas recebidas.

Preset explícito: plano Pro informado pelo usuário, Veo 3.1 Lite, 720p, 9:16. Parâmetros e disponibilidade são validados no catálogo real. A duração é arredondada para a próxima opção disponível e aparece na revisão. Cenas maiores que o limite precisam ser divididas. A cotação expira em dez minutos; autorização da fila dura até 24 horas. Falta de retorno por 45 minutos pausa para consulta, sem reenviar.

Vercel Queues publica somente identificadores. O worker busca o roteiro aprovado no Neon. O SDK recebe mensagens da fila com autenticação do serviço; um POST arbitrário não carrega um comando de geração direto. Lease de 120 segundos reduz concorrência, e o claim atômico `quoted → sending` é a proteção definitiva contra repetir o mesmo envio. Interrupção após o claim resulta em análise manual, nunca repetição automática.

## Opções consideradas

| Opção | Complexidade | Custo | Escala / adequação |
| --- | --- | --- | --- |
| Polling no navegador | Baixa | Funções existentes | Para ao fechar o celular; rejeitada como executor |
| Vercel Workflow + Nitro | Alta nesta aplicação | Uso de infraestrutura | Boa orquestração; migração desnecessária de handlers Vite/Node |
| Vercel Queues + estado Neon | Média | Operações de fila e funções conforme plano | Escolhida; preserva backend e possibilita replay seguro |

A conta consultada usa Hobby. A documentação atual inclui o primeiro milhão de operações de fila no Hobby; funções seguem seus limites/custos existentes. Não houve upgrade ou contratação. Fonte: https://vercel.com/docs/queues/pricing . API: https://vercel.com/docs/queues/quickstart . Não presumir gratuidade ilimitada.

## Consequências e limites

- A aprovação do orçamento não aprova publicação nas redes.
- Checagem técnica confirma estado do provedor e URL HTTPS reconhecida. Não avalia visualmente identidade, lip sync, continuidade ou qualidade, nem inspeciona codecs/duração real do arquivo.
- Os vídeos são cenas separadas, sem montagem automática. URLs vêm do provedor; armazenamento próprio permanente ainda não existe.
- Alteração editorial, revogação, preço ou contrato diferente pausam novos envios. Um envio já iniciado pode terminar. Resultados e históricos são preservados.
- Falha ou resposta ambígua não provoca nova tentativa paga. Retomar consulta o mesmo registro. Encerrar a produção não apaga vídeos; uma nova produção é uma nova aprovação de todas as cenas, indicada no painel.
- Quotes não iniciam vídeo. Reentrega da fila e clique duplo não autorizam outro envio. O provedor recebe `expected_credits` quando suportado.
- Uma produção ativa por roteiro. Jobs avulsos antigos permanecem consultáveis e bloqueiam nova produção enquanto incertos.
- Callback usa a região iad1 e não depende de cron de produção. Segredos permanecem somente na prévia.
- `npm audit fix` removeu alertas altos adicionados transitivamente. Restam dois alertas moderados relacionados a minimatch no SDK; uso identificado em matching de arquivos de configuração de desenvolvimento, não em entrada editorial. Não aplicar downgrade incompatível sugerido por `--force`; acompanhar atualização do SDK.

## Ações / QA

- [x] Preservar editor, exportação e geração avulsa em seções recolhidas.
- [x] Testar aprovação, custo, concorrência, isolamento, pausa, erro ambíguo e edição de roteiro.
- [x] Testar sete cenas com navegador fechado, usando provedor simulado.
- [x] Verificar nomes acessíveis, contraste automatizado e reflow 320/390px.
- [ ] Conferir recebimento da fila real com probe sem vídeo.
- [ ] Confirmar uma produção paga completa somente quando aprovada pelo operador no produto.
- [ ] Planejar montagem final e persistência própria de mídia em fase posterior.
