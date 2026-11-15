# M0 · Etapa 2 — Vitest em dois projetos + fast-check

**1. O que foi feito.** Instalei Vitest e `fast-check` e configurei dois projetos: `unit` (`*.test.ts`) e `integration` (`*.int.test.ts`). Provei com arquivos temporários (já apagados) que o teste falha sem o módulo, passa com ele e que cada projeto só roda os seus arquivos.

**2. Por que assim.** Separar unitário (rápido, sem I/O) de integração (Postgres real) deixa o ciclo TDD em milissegundos e mantém o banco só onde importa ([docs/07 §3](../../docs/07-estrategia-de-testes.md), [ADR-016](../../docs/04-decisoes-de-arquitetura.md)). Integração roda um arquivo por vez porque todos dividem o mesmo banco. O `--passWithNoTests` está só no script de integração, para o unitário nunca passar em silêncio por engano de glob.

**3. Termo novo: projeto (no Vitest).** Um grupo de testes com configuração própria (quais arquivos, qual ambiente) dentro do mesmo `vitest.config.ts`. Você escolhe qual rodar com `--project unit`.

**4. Pergunta para você responder sozinho.** Por que `pnpm test` hoje termina com erro ("No test files found") e isso é bom, enquanto `pnpm test:int` termina com sucesso nas mesmas condições?

## Com minhas palavras

