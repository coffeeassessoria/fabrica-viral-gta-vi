# Medição após publicar

Não há resultados reais ainda. [coleta.csv](coleta.csv) contém 21 linhas planejadas e campos vazios de resultado; vazio significa não medido, nunca zero.

Se houver publicação em mais de um canal, duplicar a linha por canal e registrar um único conteúdo/URL por linha. Datas previstas não são prova de publicação. Ao publicar, preencher data/hora real, canal, URL e duração final.

## Coleta manual

Registrar o primeiro retrato de desempenho em aproximadamente +24h e o segundo em +72h da publicação real. São duas coletas acumuladas, não somar uma à outra. As linhas já incluem os dois grupos de colunas. Se um indicador não estiver disponível no painel, deixar vazio e explicar em observacoes.

| Campo | O que registrar |
| --- | --- |
| views | Visualizações acumuladas, conforme definição exibida pela plataforma. Não misturar com alcance. |
| alcance | Contas alcançadas, se disponível. |
| inicio_video / chegaram_2s | Mesma base e mesma coorte, somente se o painel oferecer; usados para retenção em 2s. |
| tempo_medio_s | Tempo médio assistido informado no painel, em segundos. |
| conclusoes | Reproduções que chegaram ao final, se disponível. |
| curtidas / comentarios / compartilhamentos / salvamentos | Contagens acumuladas no mesmo instante de coleta. |
| votos_a / votos_b | Total apurado somente nos episódios FV01 e FV03, sem nomes de participantes. |

## Cálculos para comparar conteúdo próprio

- Retenção em 2s = chegaram_2s ÷ inicio_video × 100, quando ambos existirem e forem comparáveis.
- Conclusão = conclusoes ÷ inicio_video × 100, quando a plataforma usar essas bases compatíveis.
- Tempo médio relativo = tempo_medio_s ÷ duracao_s × 100. Pode superar 100% com repetição; não equivale à taxa de conclusão.
- Interações por alcance = (curtidas + comentarios + compartilhamentos + salvamentos) ÷ alcance × 100. Calcular só com todos os componentes disponíveis; compartilhamentos e salvamentos não existem em todos os painéis.
- Não calcular com denominador zero ou vazio. Não tratar valor ausente como zero. Não comparar diretamente Stories e episódios ou canais com definições diferentes.

Sem benchmark inventado. Na revisão semanal, comparar os episódios de 18h dentro do mesmo canal e da mesma janela de coleta. Sete episódios são um começo de aprendizado; formato, tema e ordem da saga variam juntos, então não atribuir causalidade a um único fator.

## Decisões da próxima semana

Se muita gente começa e sai antes da revelação, testar uma versão com conflito mais claro e virada antecipada. Se a retenção é boa mas a escolha recebe pouca resposta, simplificar o A/B. Se a saga perde público entre capítulos, testar recapitulação de até 2s no próximo ciclo e uma série mais curta.

Anotar hipótese, mudança proposta e resultado observado, separadamente. Não reescrever números para justificar uma ideia e não chamar intenção de postagem de resultado.
