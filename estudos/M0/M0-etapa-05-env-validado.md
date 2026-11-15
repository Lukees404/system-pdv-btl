# M0 · Etapa 5 — `lib/env` validado + `.env.example`

**1. O que foi feito.** `parseEnv` valida as variáveis com `zod` (`DATABASE_URL`, `DIRECT_URL`, `LOG_LEVEL`, `NODE_ENV`, mais as duas de teste opcionais). Criei o `.env.example`, o código `INVALID_ENV` e uma regra de lint: só `src/lib/env.ts` pode ler `process.env`.

**2. Por que assim.** Falhar na partida com uma lista de variáveis erradas é melhor do que falhar no meio de uma venda ([RNF-OPS-03](../../docs/03-requisitos-nao-funcionais.md)). O erro lista só os nomes, nunca os valores, porque a URL carrega senha ([RNF-SEG-06](../../docs/03-requisitos-nao-funcionais.md), [RNF-SEG-10](../../docs/03-requisitos-nao-funcionais.md)). A validação é preguiçosa para o `next build` não exigir banco. Dois testes de contrato mantêm o `.env.example` fiel ao schema e livre de segredos; provei os dois com mutações.

**3. Termo novo: validação preguiçosa (lazy).** Só validar quando alguém realmente usa a configuração pela primeira vez, e guardar o resultado. Assim o build, que não precisa do banco, não quebra.

**4. Pergunta para você responder sozinho.** Por que `DATABASE_URL` e `DIRECT_URL` são duas variáveis separadas, se as duas apontam para o mesmo Postgres?

## Com minhas palavras

