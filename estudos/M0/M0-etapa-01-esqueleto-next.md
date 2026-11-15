# M0 · Etapa 1 — Esqueleto Next.js + TypeScript estrito

**1. O que foi feito.** Criei o app Next.js (App Router), com TypeScript estrito, ESLint e Prettier. Provei que `typecheck` e `lint` falham com código errado de propósito e voltam ao verde ao removê-lo.

**2. Por que assim.** `strict` + `noUncheckedIndexedAccess` fazem erros de dinheiro e estoque aparecerem na compilação ([ADR-002](../../docs/04-decisoes-de-arquitetura.md), [RNF-MAN-01](../../docs/03-requisitos-nao-funcionais.md)). `any` explícito é erro porque o projeto proíbe contornar o `strict` com supressões. Tirei do esqueleto as opções `cacheComponents` e `partialPrefetching`: um PDV autenticado é dinâmico e elas só complicariam.

**3. Termo novo: `noUncheckedIndexedAccess`.** Ao ler `lista[0]`, o TypeScript passa a tratar o resultado como `number | undefined`, porque o item pode não existir. Você é obrigado a checar antes de usar.

**4. Pergunta para você responder sozinho.** Por que o Prettier não deve formatar a pasta `docs/`, que é a fonte da verdade? (Dica: olhe o diff que ele gerou antes de eu desfazer.)

## Com minhas palavras

