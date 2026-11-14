# CLAUDE.md — PDV Pet Shop

Sistema de PDV web (PWA) para um pet shop familiar que também faz atendimentos veterinários domiciliares. Substitui planilhas de vendas, estoque e caixa. Fase 1: sem emissão fiscal. Fase 2: NFC-e (produtos) e NFS-e Padrão Nacional (serviços) via provedor externo. Este projeto será a base para futuros clientes, mas **não generalize antes do segundo cliente** (ADR-017).

## Fonte da verdade

A documentação em `docs/` manda. **Comece por `docs/README.md`.** Se código e documentação divergem, pare e pergunte; mudanças de comportamento começam pelo documento. `estudos/` são notas de aprendizado do desenvolvedor: **não são fonte de regras** e não devem guiar a implementação.

| Preciso de... | Leia |
|---|---|
| Contexto, glossário, o que NÃO fazer | `docs/00-contexto.md` |
| Regras de negócio (`RN-*`) | `docs/01-regras-de-negocio.md` |
| Requisitos e critérios de aceitação (`RF-*`), telas | `docs/02-requisitos-funcionais.md` |
| Desempenho, segurança, LGPD, backup (`RNF-*`) | `docs/03-requisitos-nao-funcionais.md` |
| Decisões, estrutura de pastas, fluxos críticos | `docs/04-decisoes-de-arquitetura.md` |
| Tabelas, constraints, índices | `docs/05-modelo-de-dados.md` |
| NFC-e/NFS-e e preparação fiscal | `docs/06-fiscal-fase2.md` |
| TDD, convenções de teste, Definition of Done | `docs/07-estrategia-de-testes.md` |
| O que fazer agora | `docs/08-roadmap.md` |
| Dúvidas e suposições padrão | `docs/09-perguntas-em-aberto.md` |

## Fluxo de trabalho (sempre)

1. Identifique o marco atual em `docs/08-roadmap.md` e leia as regras/requisitos citados.
2. **Planeje antes de codar** (`/plan`): liste os testes que escreverá primeiro.
3. **TDD:** escreva o teste (citando `[RN-XXX-NN]` no título), **veja falhar**, implemente o mínimo, refatore. Bug novo = teste que reproduz antes da correção.
4. Commits pequenos, Conventional Commits em inglês (`test(sales): ...`, `feat(sales): ...`).
5. Ao terminar: Definition of Done (`docs/07 §9`), atualizar documentação afetada no mesmo PR.
6. Ambiguidade → `docs/09`; use a suposição padrão se existir e registre no PR; senão **pergunte**, não invente regra de negócio.

## Comandos

Definidos no M0 (atualize esta seção quando existirem). Esperado: `pnpm dev`, `pnpm test` (unitário), `pnpm test:int` (integração, Postgres de teste), `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm check:traceability`, `pnpm db:migrate`, `pnpm db:seed`.

## Stack

Next.js (App Router) + TypeScript `strict` + PostgreSQL + Prisma; Supabase só como Postgres/armazenamento via porta; deploy na Vercel; Vitest, Testing Library, Playwright, fast-check; zod nas bordas. Detalhes e justificativas: `docs/04`.

## Regras de arquitetura (invioláveis)

- **Dinheiro em centavos inteiros**; nunca `float`. Use `shared/money`.
- **Estoque = livro de movimentos** + `products.stock_qty` em cache, atualizado só pelo módulo `inventory`, na mesma transação. Baixa por `UPDATE … WHERE stock_qty >= :q`. Saldo nunca negativo.
- **Finalizar venda é transacional e idempotente** (`idempotencyKey`); seguir `docs/04 — Fluxo crítico`. Itens em ordem de ID para evitar deadlock.
- **Vendas, movimentos de estoque, devoluções, auditoria e sessões fechadas são imutáveis.** Correção = novo registro.
- **Módulos com fronteiras:** importe outro módulo só pelo `index.ts`; `domain/` é puro; sem ciclos. `pnpm check:boundaries` deve passar.
- **Server Actions finas:** validar → autorizar → caso de uso → mapear `Result`. Nada de regra de negócio em componente, action ou SQL de listagem.
- **Autorização em toda action/rota** (não basta esconder botão).
- **Tempo:** UTC no banco, `America/Manaus` na exibição; use `Clock` injetável, nunca `new Date()` direto em regra de negócio.
- **Fiscal fica atrás de porta** (Fase 2). Na Fase 1 não existe código de emissão, só campos/snapshots.
- **Específico do negócio** (categorias, serviços seed, taxa de deslocamento, campos de pet) fica em `config/business.ts` e no módulo de clientes.

## Convenções

- Código, identificadores, tabelas e commits em **inglês**; interface e documentação em **pt-BR**; textos de UI no catálogo `shared/i18n` (sem string solta em componente). Siglas fiscais (NCM, CFOP, CSOSN, CSC) ficam como são.
- Erros de domínio com `code` estável (`INSUFFICIENT_STOCK`, `CASH_SESSION_CLOSED`, `PAYMENT_MISMATCH`...); testar o código, não o texto.
- Arquivos em `kebab-case`; um caso de uso por arquivo; testes ao lado (`*.test.ts`, `*.int.test.ts`); E2E em `tests/e2e`.
- Migrações: `CHECK`, índices parciais, extensões e `GRANT/REVOKE` em SQL manual; compatíveis sem downtime; nunca editar migração já aplicada em produção.

## Testes (resumo — detalhes em `docs/07`)

- Banco **real** nos testes de transação/concorrência; **proibido mock de banco** aí.
- Sem rede, sem `sleep`, relógio e IDs injetados.
- Toda regra `RN-*` precisa de teste citando o ID.
- Cobrir sempre: idempotência, concorrência na última unidade, *rollback*, snapshots, imutabilidade, fuso `America/Manaus`.

## Segurança e privacidade

- **Nunca** commitar segredos (`.env*`, `.pfx`, chaves, CSC). Use `.env.example` sem valores.
- Sem dados pessoais (nome, CPF, telefone, endereço) em logs ou `audit_log`.
- Não adicionar dependências sem necessidade; manter lockfile; rodar auditoria de dependências.
- Upload: validar tipo real/tamanho e reprocessar a imagem.

## O que NÃO fazer

- Não implementar itens de `docs/00 §5` (não-objetivos) nem funcionalidades "para o próximo cliente".
- Não criar a porta/adaptadores fiscais antes do M11.
- Não editar vendas concluídas, movimentos ou auditoria.
- Não decidir regra de negócio ambígua sozinho.
- Não contornar fronteiras de módulos, `strict` do TypeScript ou o lint com supressões.

## Contexto de domínio rápido

Produtos só por unidade; serviços: consulta, vacinação, coleta de exames, limpeza de ouvido, raspado, atestado de viagem + taxa de deslocamento; pagamentos: dinheiro, débito, crédito, Pix (sem fiado, sem integração com maquininha); 2 usuários com permissões iguais; até 3 celulares + 1 desktop; online obrigatório; Simples Nacional, sem nota emitida até hoje; certificado A1 e inscrição estadual existentes.
