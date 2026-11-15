# M2 · Etapa 5 — Casos de uso do catálogo (com banco real)

**1. O que foi feito.** Criei os casos de uso de categorias, produtos e serviços (criar, editar, arquivar, reativar, listar e buscar), com repositórios Prisma e uma *unit of work* que junta tudo na mesma transação. Nome repetido, código de barras repetido, segunda taxa de deslocamento e categoria com produto viram erros com código estável (`PRODUCT_NAME_TAKEN`, `BARCODE_TAKEN`, `DISPLACEMENT_FEE_EXISTS`, `CATEGORY_NOT_EMPTY`...). Mudar preço ou custo, arquivar e reativar gravam a auditoria **na mesma transação**. 57 testes de integração novos; sete mutações de propósito foram pegas.

**2. Por que assim.** Quem decide "este nome já existe?" é o **índice único do banco**, não uma consulta antes de gravar: duas pessoas cadastrando o mesmo nome ao mesmo tempo passariam pela consulta, e só o índice garante que uma delas perde ([RN-CAT-02/03](../../docs/01-regras-de-negocio.md), [RN-SER-03](../../docs/01-regras-de-negocio.md)). O repositório traduz o erro do banco (o Prisma informa o nome do índice) para um código do domínio. A auditoria dentro da transação evita "preço mudou mas ninguém registrou" ([RN-ACE-02](../../docs/01-regras-de-negocio.md), [ADR-008](../../docs/04-decisoes-de-arquitetura.md)). Arquivar de novo não audita de novo (idempotência) e o produto nunca é apagado ([RN-CAT-04](../../docs/01-regras-de-negocio.md)).

**3. Termo novo: condição de corrida (race condition).** Quando o resultado depende de quem chega primeiro. "Verificar e depois gravar" tem uma brecha entre as duas coisas; deixar o banco recusar a segunda gravação fecha a brecha, porque ele decide com uma operação só.

**4. Pergunta para você responder sozinho.** Se o `createProduct` fizesse um `SELECT` para ver se o nome existe e só depois o `INSERT`, descreva um cenário com duas pessoas em que o nome duplicado entraria, e diga por que o índice único evita isso.

**Desvio do plano.** O teste de "atualizar serviço" falhou na primeira rodada por um erro **meu no teste**: o banco compartilhado já tinha a taxa de deslocamento (única), então ele passou a usar um banco próprio. O código estava certo.

## Com minhas palavras

