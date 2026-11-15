# M0 · Etapa 13 — Preparação do deploy de preview

**1. O que foi feito.** Só leitura nas suas contas (Vercel e Supabase, ambas sem projetos) e preparação local. Escrevi o roteiro `docs/runbooks/deploy-preview.md` (sem segredos). Testei o app **sem nenhuma variável de ambiente**, como numa Vercel recém-criada, e achei dois defeitos que corrigi com teste: `/api/health` dava 500 (agora 503 com log dos nomes das variáveis faltando) e `DIRECT_URL` era obrigatória no servidor.

**2. Por que assim.** O servidor só deve ter a credencial de privilégio mínimo (`DATABASE_URL`); a do dono do schema só vive no terminal de quem migra ([RNF-SEG-07](../../docs/03-requisitos-nao-funcionais.md), [ADR-005](../../docs/04-decisoes-de-arquitetura.md)). Um monitor precisa de uma resposta controlada mesmo com a configuração errada ([RNF-OBS-03](../../docs/03-requisitos-nao-funcionais.md)). A conexão direta do Supabase é só IPv6, então migramos pelo pooler em modo _session_ e o app usa o modo _transaction_ (porta 6543).

**3. Termo novo: pooler de conexões (Supavisor).** Um intermediário que mantém poucas conexões reais com o Postgres e as reparte entre muitos clientes. Em serverless, cada função abre a sua conexão, e sem pooler o banco esgotaria.

**4. Pergunta para você responder sozinho.** Por que não é boa ideia deixar o deploy rodar as migrações automaticamente no build da Vercel, e quem deve apertar esse botão?

## Com minhas palavras

