# M1 · Etapa 11 — Script `create-user` e fechamento

**1. O que foi feito.** Criei `pnpm create-user`: pede nome, e-mail e senha (duas vezes, **entrada oculta**), usa o mesmo caso de uso `createUser` e imprime só o ID. A senha não é aceita como argumento. Atualizei o `CLAUDE.md`, o roadmap (M1 "código pronto"), o runbook (nova seção com a ordem de implantação em produção) e a OQ-29. A parte pura do script tem testes unitários.

**2. Por que assim.** Só o desenvolvedor cria usuários, sem autocadastro ([RN-ACE-06](../../docs/01-regras-de-negocio.md), [RF-AUT-04](../../docs/02-requisitos-funcionais.md)). Senha por argumento ficaria no histórico do shell e na lista de processos ([RNF-SEG-06](../../docs/03-requisitos-nao-funcionais.md)); a saída nunca mostra nome nem e-mail ([RNF-LGPD-05](../../docs/03-requisitos-nao-funcionais.md)). Reusar o caso de uso garante a mesma validação, o hash argon2 e a auditoria `user.created` do resto do sistema.

**3. Termo novo: modo raw do terminal.** Normalmente o terminal mostra cada tecla e só entrega a linha no Enter. No modo raw o programa recebe cada tecla na hora e decide o que exibir: por isso o script consegue ler a senha sem ecoar.

**4. Pergunta para você responder sozinho.** No runbook, por que a migração vem **antes** do `git push` do código novo, e não depois?

**Pendente do M1.** A implantação em produção (runbook §7) ainda não foi feita: desligar a Data API, migrar, publicar, criar o primeiro usuário.

## Com minhas palavras

