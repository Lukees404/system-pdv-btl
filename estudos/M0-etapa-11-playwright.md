# M0 · Etapa 11 — Playwright (esqueleto E2E)

**1. O que foi feito.** Instalei o Playwright e configurei dois perfis: celular (360 px) e desktop. O teste de fumaça chama `/api/health` e abre a home conferindo o título, o `<h1>` e a ausência de rolagem horizontal. Rodam 4 testes (2 por perfil) contra o servidor de verdade e o Postgres. Quebrei a home e o título de propósito: os testes falharam nos dois perfis.

**2. Por que assim.** E2E são poucos e caros, mas só eles provam que servidor, banco e navegador funcionam juntos ([docs/07 §3](../docs/07-estrategia-de-testes.md)). O celular de 360 px é o menor tamanho suportado ([RNF-COM-02](../docs/03-requisitos-nao-funcionais.md)). Localmente o Playwright sobe o `pnpm dev`; no CI testa o build de produção. O texto vem do catálogo i18n, sem string solta. Esta etapa verifica comportamento que já existia, então não houve um vermelho natural: a prova foram as mutações.

**3. Termo novo: teste de fumaça (smoke test).** Um teste mínimo que só responde "o sistema liga e respira?". Se ele falha, nem vale rodar os testes detalhados.

**4. Pergunta para você responder sozinho.** Por que o teste confere que a página não rola na horizontal, e por que isso importa justamente no celular de 360 px usado na loja?

## Com minhas palavras

