# M1 · Etapa 0 — Documentos primeiro

**1. O que foi feito.** Antes de qualquer código do M1, registrei nos documentos as decisões de autenticação: ADR-011 decidido (implementação própria), modelo de dados de `users` e `sessions`, as regras RN-ACE-04/05 com os parâmetros (sessão de 30 dias absoluta, bloqueio de 15 a 60 min) e duas perguntas em aberto (OQ-28 e OQ-29).

**2. Por que assim.** "Código segue a documentação": se o comportamento muda, o documento muda primeiro, em commit próprio ([docs/README](../../docs/README.md), [CLAUDE.md](../../CLAUDE.md)). Os parâmetros que o doc não fixava viraram suposições com ID, em vez de números soltos no código ([OQ-28](../../docs/09-perguntas-em-aberto.md)). A escolha de não usar uma biblioteca pronta está justificada no [ADR-011](../../docs/04-decisoes-de-arquitetura.md).

**3. Termo novo: ADR (Architecture Decision Record).** Um registro curto de uma decisão técnica: o contexto, o que foi escolhido, as consequências e o que foi descartado. Daqui a seis meses ele responde "por que fizemos assim?".

**4. Pergunta para você responder sozinho.** Por que o ADR-011 guarda no banco só o SHA-256 do token de sessão, e não o token em si? O que um atacante que lesse a tabela `sessions` conseguiria fazer em cada caso?

## Com minhas palavras

