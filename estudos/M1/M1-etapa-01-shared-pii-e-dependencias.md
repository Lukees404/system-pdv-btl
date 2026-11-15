# M1 · Etapa 1 — `shared/pii` e dependências

**1. O que foi feito.** Tirei a lista de "chaves sensíveis" de dentro do logger e a coloquei em `shared/pii`, com 40 testes novos (o logger passou a usá-la sem mudar nenhum teste dele). Instalei `@node-rs/argon2` (hash de senha), `server-only` e `@axe-core/playwright` (acessibilidade nos testes E2E). Conferi que o argon2 carrega no Windows e que `build` e `audit` continuam verdes.

**2. Por que assim.** O módulo de auditoria vai precisar da mesma lista do logger; duas cópias acabariam divergindo, e uma delas deixaria vazar dado pessoal ([RNF-LGPD-05](../../docs/03-requisitos-nao-funcionais.md), [RN-ACE-03](../../docs/01-regras-de-negocio.md)). Refatorar com os testes do logger como rede de segurança prova que o comportamento não mudou. Provei com uma mutação: sem `email` na lista, 5 testes falham. O plano previa configurar `serverExternalPackages` para o argon2, mas a documentação do Next mostra que ele já está na lista padrão: configuração a menos.

**3. Termo novo: refatoração.** Mudar a organização do código sem mudar o que ele faz. A prova de que nada mudou são os testes que já existiam continuarem passando, sem edição.

**4. Pergunta para você responder sozinho.** Por que a lista olha o **nome do campo** (`email`, `password`) e não o conteúdo do valor? Que tipo de vazamento essa estratégia não pega?

## Com minhas palavras

