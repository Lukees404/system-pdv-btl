# M1 · Etapa 7 — Camada web: cookie, acesso e ações finas

**1. O que foi feito.** Construí, sem depender do Next, o cookie de sessão (`HttpOnly`, `SameSite=Lax`, `Secure` e prefixo `__Host-` em produção), a política de acesso `decideAccess`, os schemas `zod` dos formulários e as ações `performLogin`, `performLogout`, `performChangePassword` e `currentUser`. Por cima, a cola do Next: `src/lib/auth.ts` (`requireUser`) e as Server Actions de poucas linhas. São 24 testes unitários e 17 de integração; três mutações (userId vindo do formulário, prefixo virando rota pública, cookie gravado com login falho) foram pegas.

**2. Por que assim.** O guia do Next é claro: o `proxy.ts` só faz checagem **otimista** (existe cookie?), e a defesa de verdade é verificar a sessão em cada página e cada ação, perto dos dados ([RNF-SEG-04](../../docs/03-requisitos-nao-funcionais.md), [ADR-011](../../docs/04-decisoes-de-arquitetura.md), [ADR-019](../../docs/04-decisoes-de-arquitetura.md)). Por isso `performChangePassword` pega o `userId` da **sessão** e ignora qualquer `userId` do formulário (sem IDOR). Entrada de formulário é `unknown` até passar pelo `zod` ([RNF-SEG-05](../../docs/03-requisitos-nao-funcionais.md)). A lógica fina ficou fora do Next para ser testada com banco real e um cookie falso em memória.

**3. Termo novo: IDOR (Insecure Direct Object Reference).** Uma falha em que o sistema confia num identificador que veio do cliente (`userId=…`) e deixa a pessoa agir sobre o registro de outro. A cura é derivar o dono do que o servidor já sabe (a sessão), nunca do que o cliente manda.

**4. Pergunta para você responder sozinho.** O `proxy.ts` deixa passar qualquer requisição que tenha um cookie, mesmo com valor inventado. Por que isso não é uma falha de segurança, e onde a requisição é de fato barrada?

**Desvio do plano.** O `proxy.ts` será ativado na Etapa 8, junto com a tela de login: ativá-lo antes mandaria `/` para uma página `/login` que ainda não existe e quebraria o E2E da home. Também não precisei do alias de `server-only` no Vitest: o arquivo que o importa é só cola e é coberto pelo E2E.

## Com minhas palavras

