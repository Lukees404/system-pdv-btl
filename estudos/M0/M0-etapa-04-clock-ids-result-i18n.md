# M0 · Etapa 4 — Clock, IdGenerator, Result, DomainError e i18n

**1. O que foi feito.** Criei `Clock` (`SystemClock` e `FakeClock`), `IdGenerator` (`UuidGenerator` e `FakeIdGenerator`), `Result` (`ok`/`err`/`map`/`unwrap`) e o catálogo pt-BR com uma mensagem por código de erro. A home passou a ler o nome do app do catálogo. São 17 testes novos (77 no total).

**2. Por que assim.** Regra de negócio recebe o relógio e os ids por parâmetro, então o teste controla a hora e os identificadores ([ADR-015](../../docs/04-decisoes-de-arquitetura.md), [ADR-018](../../docs/04-decisoes-de-arquitetura.md)). Erro esperado é um valor (`Result`), não exceção, e o texto vive num lugar só ([ADR-012](../../docs/04-decisoes-de-arquitetura.md), [RNF-USA-03](../../docs/03-requisitos-nao-funcionais.md)). `Record<ErrorCode, string>` faz o compilador exigir a mensagem de todo código novo; o teste cobre o caso de mensagem vazia (provei com uma mutação).

**3. Termo novo: porta (port).** Uma interface que descreve o que o sistema precisa (`Clock.now()`), sem dizer como. A implementação real (`SystemClock`) e a de teste (`FakeClock`) ficam intercambiáveis.

**4. Pergunta para você responder sozinho.** Por que o `FakeClock` devolve uma `Date` nova a cada `now()` em vez de guardar e devolver sempre o mesmo objeto?

## Com minhas palavras

