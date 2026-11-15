# M1 · Etapa 2 — Tabelas `users`, `sessions` e `audit_log`

**1. O que foi feito.** Criei os três models no Prisma e a migração, completada à mão com `CHECK`s e com o `REVOKE` que impede a aplicação de alterar ou apagar a auditoria. Antes disso escrevi 16 testes de integração (viram falhar com `relation "users" does not exist`). Quebrei o `REVOKE` e o `CHECK` do e-mail de propósito: um teste falhou em cada caso.

**2. Por que assim.** As regras que não podem falhar ficam no banco, não só no código: papel só `OWNER`, e-mail sempre normalizado, sessão que expira depois de criada e auditoria **append-only** ([RNF-INT-02](../../docs/03-requisitos-nao-funcionais.md), [RN-ACE-03](../../docs/01-regras-de-negocio.md), [RNF-SEG-07](../../docs/03-requisitos-nao-funcionais.md)). Os `CHECK` e o `REVOKE` o Prisma não expressa, então vão em SQL manual dentro da migração ([docs/05](../../docs/05-modelo-de-dados.md)). Datas preenchidas pelo `Clock` injetável, e por isso sem `@updatedAt`. O `audit_log.id` ficou `BIGSERIAL` em vez de `IDENTITY`: é o que o Prisma gera e é equivalente para a aplicação.

**3. Termo novo: append-only.** Uma tabela onde só se acrescentam linhas; nunca se muda nem se apaga uma existente. Para uma trilha de auditoria isso é essencial: se quem foi invadido pudesse editar o registro, o registro não provaria nada.

**4. Pergunta para você responder sozinho.** O teste tenta `UPDATE`, `DELETE` e `TRUNCATE` como `pdv_app` e espera o erro `42501`. Por que a proteção está no banco e não apenas em "o código da aplicação nunca faz isso"?

## Com minhas palavras

