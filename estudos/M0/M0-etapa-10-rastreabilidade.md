# M0 · Etapa 10 — `check-traceability` (informativo)

**1. O que foi feito.** `pnpm check:traceability` lê os IDs `RN-*` e `RF-*` definidos em `docs/01` e `docs/02`, procura quais aparecem em títulos de testes e imprime cobertura por área, IDs sem teste e IDs citados que não existem. Hoje: 4 de 154 cobertos (as quatro RN-DIN que o M0 implementou). Sai com 0, sem falhar o CI.

**2. Por que assim.** Toda regra precisa de um teste que cite o ID ([RNF-MAN-05](../../docs/03-requisitos-nao-funcionais.md), [docs/07 §7](../../docs/07-estrategia-de-testes.md)). Só vale ID no **título** do teste, não em comentário ou corpo. Na primeira execução o relatório mentiu (contou IDs de exemplo escritos nos testes da própria ferramenta); reproduzi com um teste e passei a ignorar esse arquivo. Isso também mostrou que `RN-DIN-04` ("total > 0") não tem teste: ela é da venda, no M7.

**3. Termo novo: falso positivo.** Quando uma verificação diz "está tudo certo" sem estar. Em cobertura é o pior erro: dá falsa segurança. Por isso o relatório precisa de testes que tentem enganá-lo.

**4. Pergunta para você responder sozinho.** Por que a ferramenta só olha o título dos testes (`it('[RN-...]')`) e não qualquer menção ao ID no arquivo?

## Com minhas palavras

