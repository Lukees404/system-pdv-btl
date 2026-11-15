# M1 · Etapa 8 — Casca da aplicação, telas e proxy

**1. O que foi feito.** Ativei o `proxy.ts` (sem cookie → `/login`; com cookie em `/login` → `/`) e criei as telas Login, Início e Conta (trocar senha, sair) em pt-BR. A casca tem barra de navegação inferior no celular e menu lateral no desktop, link "Ir para o conteúdo", alvos de toque de 44 px e `aria-current` no item ativo. Textos novos entraram no catálogo (`tf` interpola `{name}`); 12 testes unitários novos, 323 no total.

**2. Por que assim.** O layout do grupo `(app)` chama `requireUser()`: a defesa real é no servidor, o proxy é só um atalho otimista ([RNF-SEG-04](../docs/03-requisitos-nao-funcionais.md), [ADR-011](../docs/04-decisoes-de-arquitetura.md)). A navegação segue o uso com uma mão no celular ([RNF-USA-01](../docs/03-requisitos-nao-funcionais.md)) e só lista telas que já existem ([ADR-017](../docs/04-decisoes-de-arquitetura.md)). O proxy importa `auth/access.ts` (arquivo leve) para não puxar argon2 nem Prisma para dentro dele. Nenhuma string solta em componente ([RNF-USA-03](../docs/03-requisitos-nao-funcionais.md)).

**3. Termo novo: Server Action com `useActionState`.** Uma função do servidor ligada ao `<form action>`. O hook guarda o que ela devolveu (erro ou sucesso) e diz se está pendente, então o formulário funciona sem escrever `fetch` e mostra a mensagem de volta.

**4. Pergunta para você responder sozinho.** A tela de login mostra a mesma mensagem para "senha errada" e para "conta bloqueada". Que informação um atacante ganharia se as mensagens fossem diferentes?

**Desvio do plano.** O arquivo `src/app/page.tsx` público foi removido (a rota `/` agora é a Início protegida) e o E2E de fumaça passou a conferir o redirecionamento para `/login`. As telas logadas serão provadas no navegador, com axe, na Etapa 9.

## Com minhas palavras

