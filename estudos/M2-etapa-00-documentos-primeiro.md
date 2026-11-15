# M2 · Etapa 0 — Documentos primeiro

**1. O que foi feito.** Antes de escrever código do catálogo, atualizei os documentos: a ADR-020 (busca) agora diz que **a aplicação normaliza o texto** e que só o `pg_trgm` fica, num schema próprio (`ext`); o `unaccent` sai. Ajustei também o modelo de dados, a estratégia de testes, o runbook e o roadmap (M2 em andamento), e registrei duas decisões em aberto: OQ-30 (estoque inicial só no M3) e OQ-31 (detalhes que os docs não fixam, como o formato do CEST).

**2. Por que assim.** Mudança de comportamento começa pelo documento, e se código e docs divergem eu paro e pergunto (regra do `CLAUDE.md`). O `unaccent` do Postgres é `STABLE`, então não pode ser usado num índice, e manter a mesma regra de normalização em dois lugares (banco e código) é pedir divergência ([ADR-020](../docs/04-decisoes-de-arquitetura.md), [RN-CAT-02/03](../docs/01-regras-de-negocio.md), [RNF-DES-01](../docs/03-requisitos-nao-funcionais.md)). O estoque inicial fica para o M3 porque `products.stock_qty` só pode ser escrito pelo módulo `inventory` ([ADR-007](../docs/04-decisoes-de-arquitetura.md)).

**3. Termo novo: índice trigram (GIN + `pg_trgm`).** Ele quebra cada texto em pedaços de 3 letras ("coleira" vira "col", "ole", "lei"...) e indexa esses pedaços. Assim uma busca por parte do nome (`ILIKE '%olei%'`) acha candidatos sem varrer a tabela inteira.

**4. Pergunta para você responder sozinho.** Se a normalização (tirar acentos e maiúsculas) ficasse metade no banco e metade no código, que bug aparecer só em produção seria possível, por exemplo com o nome "Ração"?

## Com minhas palavras

