# M0 · Etapa 12 — CI no GitHub Actions

**1. O que foi feito.** Um workflow com 5 jobs: `verify` (lint, formato, tipos, fronteiras, testes unitários, Postgres, migrações, integração, rastreabilidade, build), `windows-unit`, `audit` (dependências), `secrets` (gitleaks) e `e2e` (só na `main`). Uma action composta instala pnpm e Node a partir de `packageManager` e `.nvmrc`. Como ainda não há repositório no GitHub, simulei o CI num clone limpo com um Postgres novo.

**2. Por que assim.** O CI repete em Linux o que você roda no Windows e é o portão real de qualidade, na ordem do [docs/07 §8](../../docs/07-estrategia-de-testes.md) ([RNF-OPS-01](../../docs/03-requisitos-nao-funcionais.md)). A auditoria e a varredura de segredos cumprem [RNF-SEG-08](../../docs/03-requisitos-nao-funcionais.md) e [RNF-SEG-06](../../docs/03-requisitos-nao-funcionais.md). O job no Windows pega cedo problemas de caminho e fim de linha. O mesmo SQL de papéis serve ao Docker local e ao CI.

**3. Termo novo: lockfile congelado (`--frozen-lockfile`).** O CI instala exatamente as versões do `pnpm-lock.yaml` e falha se o `package.json` e o lockfile divergirem. Assim "funciona na minha máquina" e "funciona no CI" usam o mesmo código de terceiros.

**4. Pergunta para você responder sozinho.** Por que o E2E roda só na `main` e não em todo pull request? O que se ganha e o que se arrisca com isso?

## Com minhas palavras

