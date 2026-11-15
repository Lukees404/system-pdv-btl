# PDV Pet Shop

[![CI](https://github.com/Lukees404/system-pdv-btl/actions/workflows/ci.yml/badge.svg)](https://github.com/Lukees404/system-pdv-btl/actions/workflows/ci.yml)

Sistema de ponto de venda (PDV) web, instalável como PWA, para um pet shop familiar que também faz atendimentos veterinários domiciliares. Substitui as planilhas de vendas, estoque e caixa.

- **Fase 1 (em andamento):** catálogo, importação de planilha, clientes e pets, estoque, caixa, vendas, devoluções e relatórios. **Sem emissão fiscal.**
- **Fase 2:** NFC-e (produtos) e NFS-e Padrão Nacional (serviços) por provedor externo. A Fase 1 já deixa o modelo de dados preparado.
- Projeto no estilo **Build to Learn**: cada etapa é desenvolvida em TDD e acompanhada de uma nota de estudo em [`estudos/`](estudos/README.md).

## Status

| Marco  | Escopo                                                                                    | Situação                  |
| ------ | ----------------------------------------------------------------------------------------- | ------------------------- |
| M0     | Fundação (esqueleto, CI, banco, deploy)                                                   | ☑ concluído               |
| M1     | Autenticação e auditoria                                                                  | ☑ concluído e em produção |
| M2     | Catálogo (produtos, categorias, serviços, busca)                                          | ◐ em andamento            |
| M3–M11 | Estoque, importação, clientes, caixa, venda, devolução, relatórios, endurecimento, fiscal | planejados                |

O roteiro completo, com escopo e critérios de saída de cada marco, está em [`docs/08-roadmap.md`](docs/08-roadmap.md).

## Stack

Next.js (App Router) · TypeScript `strict` · PostgreSQL 17 · Prisma · zod · Vitest, fast-check e Playwright (com axe) · deploy na Vercel com Supabase apenas como Postgres. Detalhes e justificativas nas ADRs de [`docs/04-decisoes-de-arquitetura.md`](docs/04-decisoes-de-arquitetura.md).

## Como rodar localmente

Os comandos funcionam no **PowerShell (Windows)** e no Linux.

**Pré-requisitos:** Node.js 24 (ver `.nvmrc`; mínimo 22), pnpm 12 e Docker Desktop (para o Postgres local).

```powershell
pnpm install
Copy-Item .env.example .env     # primeira vez; os valores locais já servem
pnpm db:up                      # Postgres 17 em 127.0.0.1:54329 (Docker Desktop aberto)
pnpm db:migrate                 # aplica as migrações
pnpm dev                        # http://localhost:3000
```

Para entrar no sistema é preciso criar um usuário (não existe autocadastro):

```powershell
pnpm create-user                # pede nome, e-mail e senha (a senha é digitada sem aparecer)
```

## Comandos

| Comando                                   | O que faz                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm check`                              | Lint, formatação, tipos, fronteiras de módulos e testes unitários (rápido, sem banco)  |
| `pnpm test` / `pnpm test:watch`           | Testes unitários (Vitest)                                                              |
| `pnpm test:int`                           | Integração com Postgres real, um banco isolado por arquivo (exige `pnpm db:up`)        |
| `pnpm test:e2e`                           | Playwright em celular 360 px e desktop (exige `pnpm db:up`; sobe o `pnpm dev` sozinho) |
| `pnpm build` / `pnpm start`               | Build e servidor de produção                                                           |
| `pnpm db:up` / `pnpm db:down`             | Liga e desliga o Postgres local                                                        |
| `pnpm db:migrate` / `pnpm db:migrate:dev` | Aplica as migrações / cria uma migração nova                                           |
| `pnpm db:seed`                            | Dados iniciais (idempotente)                                                           |
| `pnpm check:boundaries`                   | Confere as fronteiras entre módulos                                                    |
| `pnpm check:traceability`                 | Mostra regras (`RN-*`, `RF-*`) ainda sem teste                                         |
| `pnpm create-user`                        | Cria um usuário `OWNER`                                                                |

## Estrutura do repositório

```text
.
├─ docs/                documentação (fonte da verdade); runbooks/ com os procedimentos operacionais
├─ estudos/             notas de aprendizado por marco (não são fonte de regras)
├─ src/
│  ├─ app/              rotas, layouts e Server Actions finas (Next.js)
│  ├─ modules/          módulos de negócio com fronteiras: audit, auth e, a cada marco, os demais
│  │                    (cada um com domain/ puro, application/, infrastructure/ e index.ts público)
│  ├─ shared/           dinheiro, relógio, ids, Result, erros, i18n, texto e PII (sem importar módulos)
│  ├─ lib/              banco, env validado, logger, cabeçalhos de segurança
│  └─ proxy.ts          checagem otimista de sessão, CSP com nonce e cabeçalhos fixos
├─ prisma/              schema, migrações (SQL manual para CHECK, índices e privilégios) e seed
├─ scripts/             create-user e verificação de rastreabilidade
├─ tests/               e2e/, integration/, boundaries/ e fixtures/ (dependências de teste)
├─ docker/              inicialização do Postgres local (papéis e bancos)
└─ .github/             CI (GitHub Actions)
```

## Documentação

Comece por [`docs/README.md`](docs/README.md): contexto, regras de negócio (`RN-*`), requisitos (`RF-*`, `RNF-*`), decisões de arquitetura, modelo de dados, estratégia de testes, roadmap e perguntas em aberto. Para implantar ou operar o sistema, veja [`docs/runbooks/deploy-preview.md`](docs/runbooks/deploy-preview.md).

## Como se trabalha aqui

As regras completas estão em [`CLAUDE.md`](CLAUDE.md). Em resumo:

1. **A documentação manda.** Mudança de comportamento começa pelo documento, em commit próprio.
2. **TDD.** O teste cita o ID da regra no título (`[RN-XXX-NN]`), é visto falhando e só então se implementa.
3. **Dinheiro em centavos inteiros**, estoque como livro de movimentos, vendas e auditoria imutáveis, autorização em toda ação.
4. **Commits pequenos** em inglês, no padrão Conventional Commits (`test(...)`, `feat(...)`, `fix(...)`, `docs(...)`).
5. **Branches e Pull Requests.** A `main` é protegida: só recebe PR com o CI verde (sem push direto). Cada etapa nasce numa `feature/...`, abre um PR e entra por _squash merge_:

   ```powershell
   git switch main; git pull
   git switch -c feature/m2-etapa-03-auditoria
   # ...commits pequenos (test, feat, docs)...
   git push -u origin feature/m2-etapa-03-auditoria
   gh pr create --base main      # o CI roda no PR; com tudo verde: squash merge e apagar a branch
   ```

6. Código e identificadores em inglês; interface e documentação em pt-BR.

## Segurança

Nunca versione segredos (`.env*`, certificados, chaves): o `.env.example` não tem valores reais e o CI roda uma varredura de segredos. Dados pessoais não vão para logs nem para a auditoria.

## Licença

Todos os direitos reservados. O código está público apenas para consulta; não há licença de uso, cópia ou distribuição concedida.
