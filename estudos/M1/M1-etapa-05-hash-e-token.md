# M1 · Etapa 5 — Hash de senha e token de sessão

**1. O que foi feito.** Duas portas (`PasswordHasher` e `SessionTokens`) e suas implementações: `Argon2PasswordHasher` (argon2id, 19 MiB, 2 passes, 1 thread) e `RandomSessionTokens` (32 bytes aleatórios em base64url; o banco guarda só o SHA-256). Criei também fakes rápidos para os testes dos casos de uso. São 20 testes novos; três mutações (custo menor, hash corrompido aceito, token de 16 bytes) foram pegas.

**2. Por que assim.** Senha exige hash **lento e com sal** para que roubar o banco não dê as senhas de graça ([RN-ACE-05](../../docs/01-regras-de-negocio.md)). Token de sessão já é aleatório e longo, então SHA-256 simples basta e o banco nunca guarda o token em claro ([RNF-SEG-02](../../docs/03-requisitos-nao-funcionais.md), [ADR-011](../../docs/04-decisoes-de-arquitetura.md)). Um hash corrompido devolve `false` em vez de lançar exceção: para quem tenta entrar, "não confere" é a única resposta possível. As portas deixam os casos de uso da próxima etapa rodarem com um hasher falso e instantâneo.

**3. Termo novo: sal (salt).** Um texto aleatório misturado à senha antes do hash. Duas pessoas com a mesma senha acabam com hashes diferentes, e o atacante não consegue reaproveitar uma tabela pronta de hashes.

**4. Pergunta para você responder sozinho.** Por que a senha usa um hash propositalmente lento (argon2) e o token de sessão usa um simples e rápido (SHA-256)? O que muda entre os dois quanto à dificuldade de adivinhar o valor original?

## Com minhas palavras

