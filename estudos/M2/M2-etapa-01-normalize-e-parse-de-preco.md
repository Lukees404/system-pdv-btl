# M2 · Etapa 1 — `normalizeText` e `parseMoneyInput`

**1. O que foi feito.** Criei duas funções puras em `shared`: `normalizeText` (minúsculas, sem acento, espaços colapsados) e `parseMoneyInput` (texto como `R$ 1.234,56` vira centavos inteiros ou o erro `INVALID_MONEY`). 29 testes novos, incluindo uma propriedade com fast-check (500 textos aleatórios): o resultado é idempotente, sem maiúsculas, sem marcas e sem espaços sobrando. Quebrei as duas de propósito e os testes pegaram.

**2. Por que assim.** A mesma função normaliza o que vai para `name_normalized` e o termo da busca, então os dois nunca divergem ([ADR-020](../../docs/04-decisoes-de-arquitetura.md), [RN-CAT-02/03](../../docs/01-regras-de-negocio.md)). O preço é lido como texto, dígito a dígito, sem `float` ([RN-DIN-01](../../docs/01-regras-de-negocio.md), [ADR-006](../../docs/04-decisoes-de-arquitetura.md)). O ponto só vale como milhar (grupos de 3): `12.50` vira erro em vez de virar R$ 1.250,00 sem ninguém perceber. O `parseMoneyInput` também servirá à importação (M4).

**3. Termo novo: normalização Unicode (NFD).** O mesmo "ç" pode ser um caractere só ou um "c" + uma cedilha solta. A forma NFD sempre separa em letra + marca; depois é só apagar as marcas. Sem isso, "Ração" digitada de dois jeitos seria dois textos diferentes.

**4. Pergunta para você responder sozinho.** Por que a normalização passa o texto para minúsculas **antes** de decompor e apagar as marcas, e não depois?

## Com minhas palavras

