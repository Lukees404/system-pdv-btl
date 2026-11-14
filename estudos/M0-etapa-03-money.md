# M0 · Etapa 3 — `shared/money` (TDD)

**1. O que foi feito.** Escrevi os testes primeiro (viram falhar), depois `money`, `add`/`subtract`/`sum`, `times`, `percentOf`, `allocate` (rateio) e `formatBRL`. São 60 testes, 8 deles de propriedade com `fast-check`. Quebrei o half-up de propósito: 5 testes falharam; revertido.

**2. Por que assim.** Dinheiro em centavos inteiros evita erro de ponto flutuante ([RN-DIN-01](../docs/01-regras-de-negocio.md), [ADR-006](../docs/04-decisoes-de-arquitetura.md)). O desconto arredonda half-up ([RN-DIN-02](../docs/01-regras-de-negocio.md)) e o rateio usa o maior resto para a soma das partes ser exata ([RN-DIN-05](../docs/01-regras-de-negocio.md)). As contas usam `BigInt` para não estourar o inteiro seguro. O formato é próprio, sem `Intl`, para não depender do ambiente.

**3. Termo novo: método do maior resto.** Para dividir 100 centavos em 3 partes iguais, cada uma leva 33 (soma 99). O centavo que sobrou vai para quem teve a maior "sobra" na divisão; em empate, vai para o primeiro da lista. Assim a soma fecha sempre em 100.

**4. Pergunta para você responder sozinho.** Com `allocate(2, [1,1,1])` o resultado é `[1,1,0]`. Por que dar o centavo extra ao primeiro item, e não ao último, é uma escolha que precisa ser sempre a mesma?

## Com minhas palavras

