# M2 · Etapa 2 — Modelo de dados e migração do catálogo

**1. O que foi feito.** Criei as tabelas `categories`, `products` e `services` com as regras no próprio banco: preço/custo/estoque ≥ 0, nome 1–120, formatos fiscais (NCM 8, CEST 7, CFOP 4, CSOSN 3, origem 0–8), nome único **só entre ativos**, código de barras único entre todos e no máximo **uma** taxa de deslocamento. A aplicação (`pdv_app`) **não consegue excluir** produtos nem serviços. A migração também moveu o `pg_trgm` para o schema `ext` e removeu o `unaccent`. 17 testes de integração novos; quebrei o SQL de propósito duas vezes e os testes pegaram.

**2. Por que assim.** Regra importante mora no banco, não só no código ([RNF-INT-02](../docs/03-requisitos-nao-funcionais.md)): produtos "nunca são excluídos, só arquivados" ([RN-CAT-04](../docs/01-regras-de-negocio.md)) vira um `REVOKE DELETE` ([RNF-SEG-07](../docs/03-requisitos-nao-funcionais.md)). O nome único usa um **índice parcial** (`WHERE archived_at IS NULL`), então arquivar libera o nome ([RN-CAT-02](../docs/01-regras-de-negocio.md)). O índice trigram viabiliza a busca parcial ([ADR-020](../docs/04-decisoes-de-arquitetura.md)).

**3. Termo novo: índice parcial.** Um índice que só cobre as linhas que obedecem a uma condição. Aqui, só os produtos ativos entram na regra de nome único; os arquivados ficam de fora, e por isso dois produtos podem ter o mesmo nome se um deles estiver arquivado.

**4. Pergunta para você responder sozinho.** Com 5.000 produtos o Postgres escolheu varrer a tabela em vez de usar o índice trigram, e isso estava certo. Por que usar o índice seria pior nesse tamanho, e quando passaria a valer a pena?

**Desvio do plano.** O `ALTER EXTENSION pg_trgm SET SCHEMA ext` foi recusado (os objetos da extensão pertencem ao superusuário). Como nada usava o `pg_trgm` ainda, a migração faz `DROP EXTENSION` + `CREATE EXTENSION … SCHEMA ext`, que o dono da extensão pode fazer. Falta conferir isso no Supabase ao migrar a produção.

## Com minhas palavras

