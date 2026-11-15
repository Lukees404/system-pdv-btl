# M0 · Etapa 7 — Fronteiras de módulos

**1. O que foi feito.** Configurei o `dependency-cruiser` com a matriz de dependências do doc 04, `domain/` puro, `shared/` sem módulos e sem ciclos. Uma regra ESLint barra `new Date()` e `Date.now()` em `domain/` e `application/`. Criei `pnpm check:boundaries`.

**2. Por que assim.** Uma arquitetura só vale se a ferramenta barra a violação ([ADR-001](../../docs/04-decisoes-de-arquitetura.md), [RNF-MAN-02/03](../../docs/03-requisitos-nao-funcionais.md)). Para provar que a regra funciona, o teste cruza uma pasta de fixtures com imports certos e errados e exige o conjunto exato de violações: pega regra faltando e falso positivo. O relógio vem injetado ([ADR-015](../../docs/04-decisoes-de-arquitetura.md)). Provei com mutações: afrouxar a matriz derruba o teste, e uma violação real em `src/` faz o CLI sair com erro.

**3. Termo novo: fronteira de módulo.** Cada módulo tem uma "porta da frente" (`index.ts`); os outros só podem entrar por ela, nunca pelos cômodos de dentro (`domain/`, `infrastructure/`). Assim dá para mudar o interior sem quebrar quem usa o módulo.

**4. Pergunta para você responder sozinho.** Por que `sales` pode depender de `cash-register`, mas `cash-register` não pode depender de `sales`? (Dica: releia "O caixa não depende de vendas" no doc 04.)

## Com minhas palavras

