# M2 · Etapa 4 — Domínio do catálogo (regras puras)

**1. O que foi feito.** Criei o domínio do módulo `catalog` como funções puras: `validateProduct`, `validateService`, `validateCategory` e `validateFiscalFields`. Elas recebem o que veio do formulário e devolvem os dados limpos (nome sem espaços nas pontas, `nameNormalized`, vazio virando `null`, unidade em maiúsculas) ou o **primeiro erro**, com `details.field` dizendo qual campo. Entraram quatro códigos de erro novos com mensagem em pt-BR. 65 testes novos, incluindo uma propriedade com fast-check; quebrei três regras de propósito e os testes pegaram.

**2. Por que assim.** Regra de negócio mora no domínio, não em componente nem em Server Action ([ADR-001](../../docs/04-decisoes-de-arquitetura.md) e [ADR-012](../../docs/04-decisoes-de-arquitetura.md)), então dá para testar sem banco e sem tela ([RN-CAT-01/03/07](../../docs/01-regras-de-negocio.md), [RN-SER-01/05/07](../../docs/01-regras-de-negocio.md), [RN-FIS-02](../../docs/01-regras-de-negocio.md)). O banco continua sendo a última barreira (CHECKs da Etapa 2), mas o domínio dá o erro **bonito**, por campo, antes de chegar lá. O domínio não repete o valor digitado no erro e não conhece estoque nem custo de serviço (RN-SER-05/07).

**3. Termo novo: função pura.** Uma função que, para a mesma entrada, devolve sempre a mesma saída e não mexe em nada fora dela (sem banco, sem relógio, sem rede). Por isso testar é só chamar e comparar, e por isso o `domain/` não pode importar Next nem Prisma.

**4. Pergunta para você responder sozinho.** O nome do produto é validado no domínio **e** tem um CHECK no banco. Se só existisse o CHECK, que experiência o usuário teria ao digitar um nome com 121 caracteres, e o que só o domínio consegue fazer melhor?

## Com minhas palavras

