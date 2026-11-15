# M1 · Etapa 9 — E2E de autenticação e acessibilidade

**1. O que foi feito.** Escrevi 11 testes de ponta a ponta no navegador (celular 360 px e desktop): login feliz e com senha errada, sair, rotas protegidas, cookie inventado, troca de senha (a nova entra, a antiga não), `/signup` e `/register` com 404, axe sem violações em Login/Início/Conta e alvos de toque ≥ 44 px. Cada teste cria o próprio usuário pelo caso de uso real. Os testes acharam **dois defeitos reais**, corrigidos: um laço de redirecionamento com cookie inválido e o `login` segurando transação durante o hash.

**2. Por que assim.** Só o navegador prova cookie, redirecionamento e foco funcionando juntos ([RNF-SEG-04](../../docs/03-requisitos-nao-funcionais.md), [RF-AUT-01..03](../../docs/02-requisitos-funcionais.md), [RN-ACE-06](../../docs/01-regras-de-negocio.md), [RNF-USA-04](../../docs/03-requisitos-nao-funcionais.md)). Um usuário por teste evita que o bloqueio por tentativas de um derrube os outros. O proxy só vê "existe cookie"; por isso `requireUser()` agora manda a uma rota que apaga o cookie velho, em vez de voltar direto ao login.

**3. Termo novo: pool de conexões.** Um conjunto pequeno de conexões com o banco que as requisições dividem. Se uma requisição fica com uma conexão ocupada enquanto faz uma conta pesada (o hash argon2), as outras esperam e podem estourar o prazo. Por isso o hash agora roda fora da transação.

**4. Pergunta para você responder sozinho.** Com a sessão revogada (senha trocada em outro aparelho) o cookie velho continua no navegador. Por que o proxy sozinho não percebe isso e que laço aconteceria sem a rota que apaga o cookie?

**Desvio do plano.** O usuário de teste é criado num processo `tsx` à parte, porque o Playwright carrega TypeScript como CommonJS e o client gerado do Prisma é ESM. Localmente os testes usam 2 workers (o `next dev` compila rotas a frio). `changePassword` também faz hash dentro da transação; ficou como ponto a revisitar (é raro e precisa de atomicidade).

## Com minhas palavras

