# M0 · Etapa 8 — Postgres (Docker), Prisma e papéis de banco

**1. O que foi feito.** Docker Compose com Postgres 17 (só em `127.0.0.1`), dois papéis (`pdv_owner` migra, `pdv_app` só faz DML), Prisma 7.10.1 sem models, migração-base (extensões `unaccent`/`pg_trgm` e permissões) e `createDb` sobre o adapter `pg`. Cada arquivo de teste de integração cria um banco próprio e o apaga no fim. São 10 testes novos.

**2. Por que assim.** Bugs de concorrência e constraint só aparecem em Postgres de verdade ([docs/07 §4](../docs/07-estrategia-de-testes.md)). A aplicação conecta com um usuário que não cria nem apaga tabelas, então um erro ou injeção não destrói o schema ([RNF-SEG-07](../docs/03-requisitos-nao-funcionais.md)). No Prisma 7 a URL das migrações vive em `prisma.config.ts` (`DIRECT_URL`) e o app usa `DATABASE_URL` ([ADR-004](../docs/04-decisoes-de-arquitetura.md), [ADR-005](../docs/04-decisoes-de-arquitetura.md)). Fixei a 7.10.1 porque a tag `latest` do CLI aponta para um RC. Provei com mutações: sem o privilégio padrão de DML ou com `CREATE` no schema, os testes de papel falham.

**3. Termo novo: privilégio mínimo.** Dar a cada usuário só o que ele precisa. A aplicação só lê e grava linhas; quem muda a estrutura do banco é outro usuário, usado só nas migrações.

**4. Pergunta para você responder sozinho.** Por que a migração-base falha de propósito se o papel `pdv_app` não existir, em vez de simplesmente pular os `GRANT`?

## Com minhas palavras

