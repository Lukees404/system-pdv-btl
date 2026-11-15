# M1 · Etapa 10 — CSP com nonce e cabeçalhos de segurança

**1. O que foi feito.** O `proxy.ts` agora põe em toda resposta (página, redirecionamento e 401) uma CSP com **nonce novo por requisição** e os cabeçalhos fixos: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` e HSTS (só em produção). O layout raiz virou dinâmico (`connection()`), senão páginas pré-renderizadas ficariam sem nonce. Rodei o E2E também no **build de produção**, onde a CSP é estrita, e ele achou mais um bug real: o cookie `__Host-` não era apagado ao sair.

**2. Por que assim.** A CSP é a última barreira contra XSS ([RNF-SEG-01](../docs/03-requisitos-nao-funcionais.md)): com `nonce` + `strict-dynamic`, só scripts que o servidor marcou executam, e `unsafe-inline`/`unsafe-eval` ficam de fora em produção. As funções são puras (`buildCsp`, `staticSecurityHeaders`) e testadas sem navegador. O `isDevelopment()` lê só `NODE_ENV`, para o proxy nunca falhar por outra variável.

**3. Termo novo: nonce.** Um valor aleatório usado uma única vez. O servidor o coloca na CSP e nos seus `<script>`; o navegador só executa scripts com o mesmo valor. Quem injeta HTML malicioso não sabe o nonce da requisição, então o script dele não roda.

**4. Pergunta para você responder sozinho.** Por que um cookie `__Host-` só pode ser apagado por uma resposta que também traga `Secure` e `Path=/`, e o que acontecia no navegador quando isso faltava?

**Desvio do plano.** O logout agora grava o cookie vencido pelo `jar.set` (a interface `delete` saiu), e `/api/auth/expired` virou rota pública: logo após sair, uma re-renderização sem cookie caía no 401 do proxy.

## Com minhas palavras

