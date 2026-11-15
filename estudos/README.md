# Estudos

Notas de aprendizado do desenvolvedor, uma por etapa concluída. **Não são fonte de regras** e não guiam a implementação: a fonte da verdade é [`docs/`](../docs/README.md).

Cada nota tem até 20 linhas: o que foi feito, por que, um termo novo, uma pergunta para responder sozinho e a seção "Com minhas palavras" para preencher.

## M0 — Fundação

| Etapa | Tema | Nota |
|---|---|---|
| 1 | Esqueleto Next.js + TypeScript estrito | [M0/M0-etapa-01-esqueleto-next.md](M0/M0-etapa-01-esqueleto-next.md) |
| 2 | Vitest em dois projetos + fast-check | [M0/M0-etapa-02-vitest-dois-projetos.md](M0/M0-etapa-02-vitest-dois-projetos.md) |
| 3 | `shared/money` (TDD) | [M0/M0-etapa-03-money.md](M0/M0-etapa-03-money.md) |
| 4 | Clock, IdGenerator, Result, DomainError e i18n | [M0/M0-etapa-04-clock-ids-result-i18n.md](M0/M0-etapa-04-clock-ids-result-i18n.md) |
| 5 | `lib/env` validado + `.env.example` | [M0/M0-etapa-05-env-validado.md](M0/M0-etapa-05-env-validado.md) |
| 6 | Logger estruturado com redação de PII | [M0/M0-etapa-06-logger.md](M0/M0-etapa-06-logger.md) |
| 7 | Fronteiras de módulos | [M0/M0-etapa-07-fronteiras-de-modulos.md](M0/M0-etapa-07-fronteiras-de-modulos.md) |
| 8 | Postgres (Docker), Prisma e papéis de banco | [M0/M0-etapa-08-postgres-prisma-roles.md](M0/M0-etapa-08-postgres-prisma-roles.md) |
| 9 | `/api/health` | [M0/M0-etapa-09-health.md](M0/M0-etapa-09-health.md) |
| 10 | `check-traceability` (informativo) | [M0/M0-etapa-10-rastreabilidade.md](M0/M0-etapa-10-rastreabilidade.md) |
| 11 | Playwright (esqueleto E2E) | [M0/M0-etapa-11-playwright.md](M0/M0-etapa-11-playwright.md) |
| 12 | CI no GitHub Actions | [M0/M0-etapa-12-ci.md](M0/M0-etapa-12-ci.md) |
| 13 | Preparação do deploy de preview | [M0/M0-etapa-13-preparacao-do-deploy.md](M0/M0-etapa-13-preparacao-do-deploy.md) |
| 14 | Fechamento do marco | [M0/M0-etapa-14-fechamento.md](M0/M0-etapa-14-fechamento.md) |

## M1 — Autenticação e auditoria

| Etapa | Tema | Nota |
|---|---|---|
| 0 | Documentos primeiro | [M1/M1-etapa-00-documentos-primeiro.md](M1/M1-etapa-00-documentos-primeiro.md) |
| 1 | `shared/pii` e dependências | [M1/M1-etapa-01-shared-pii-e-dependencias.md](M1/M1-etapa-01-shared-pii-e-dependencias.md) |
| 2 | Tabelas `users`, `sessions` e `audit_log` | [M1/M1-etapa-02-tabelas-e-migracao.md](M1/M1-etapa-02-tabelas-e-migracao.md) |
| 3 | Módulo `audit` | [M1/M1-etapa-03-modulo-audit.md](M1/M1-etapa-03-modulo-audit.md) |
| 4 | Regras puras de `auth` (domínio) | [M1/M1-etapa-04-regras-puras-de-auth.md](M1/M1-etapa-04-regras-puras-de-auth.md) |
| 5 | Hash de senha e token de sessão | [M1/M1-etapa-05-hash-e-token.md](M1/M1-etapa-05-hash-e-token.md) |
| 6 | Casos de uso de `auth` com banco real | [M1/M1-etapa-06-casos-de-uso-de-auth.md](M1/M1-etapa-06-casos-de-uso-de-auth.md) |
| 7 | Camada web: cookie, acesso e ações finas | [M1/M1-etapa-07-camada-web.md](M1/M1-etapa-07-camada-web.md) |
| 8 | Casca da aplicação, telas e proxy | [M1/M1-etapa-08-casca-e-telas.md](M1/M1-etapa-08-casca-e-telas.md) |
| 9 | E2E de autenticação e acessibilidade | [M1/M1-etapa-09-e2e-e-acessibilidade.md](M1/M1-etapa-09-e2e-e-acessibilidade.md) |
| 10 | CSP com nonce e cabeçalhos de segurança | [M1/M1-etapa-10-csp-e-cabecalhos.md](M1/M1-etapa-10-csp-e-cabecalhos.md) |
| 11 | Script `create-user` e fechamento | [M1/M1-etapa-11-create-user-e-fechamento.md](M1/M1-etapa-11-create-user-e-fechamento.md) |

## M2 — Catálogo

| Etapa | Tema | Nota |
|---|---|---|
| 0 | Documentos primeiro | [M2/M2-etapa-00-documentos-primeiro.md](M2/M2-etapa-00-documentos-primeiro.md) |
| 1 | `normalizeText` e `parseMoneyInput` | [M2/M2-etapa-01-normalize-e-parse-de-preco.md](M2/M2-etapa-01-normalize-e-parse-de-preco.md) |
| 2 | Modelo de dados e migração do catálogo | [M2/M2-etapa-02-modelo-de-dados-do-catalogo.md](M2/M2-etapa-02-modelo-de-dados-do-catalogo.md) |
| 3 | Auditoria do catálogo | [M2/M2-etapa-03-auditoria-do-catalogo.md](M2/M2-etapa-03-auditoria-do-catalogo.md) |
| 4 | Domínio do catálogo (regras puras) | [M2/M2-etapa-04-dominio-do-catalogo.md](M2/M2-etapa-04-dominio-do-catalogo.md) |

As próximas notas nascem na pasta do marco (`estudos/M3/`, ...), com o nome `M?-etapa-NN-tema.md`.
