# M2 · Etapa 3 — Auditoria do catálogo

**1. O que foi feito.** O catálogo de ações auditáveis ganhou seis nomes: `product.price_changed`, `product.archived`, `product.reactivated` e os três equivalentes de `service.*`. Testes novos garantem o padrão `entidade.verbo`, nomes sem repetição, que o antes/depois de preço e custo (em centavos) e os ids passam, que dado pessoal continua sendo recusado e que cada ação é gravada de verdade no `audit_log` (banco real, como `pdv_app`). Foi a primeira etapa feita em branch própria (`feature/m2-etapa-03-auditoria`) e entregue por Pull Request.

**2. Por que assim.** A auditoria registra "alteração de preço/custo" e "arquivamento/reativação" ([RN-ACE-02](../../docs/01-regras-de-negocio.md)); o preço novo só vale para vendas futuras e o antigo fica registrado ([RN-CAT-05](../../docs/01-regras-de-negocio.md)). Os dados são só ids e centavos, nunca nome de cliente ([RN-ACE-03](../../docs/01-regras-de-negocio.md), [RNF-LGPD-05](../../docs/03-requisitos-nao-funcionais.md)). Criar ou renomear não audita, porque a regra não lista essas ações. Os nomes ficam gravados no banco para sempre, por isso o catálogo de ações é fechado em TypeScript: ação nova que não esteja na lista nem compila.

**3. Termo novo: Pull Request (PR).** Um pedido para "levar as mudanças desta branch para a `main`". O PR roda o CI e só deixa mesclar com tudo verde. É o portão que impede um commit quebrado de chegar à branch principal.

**4. Pergunta para você responder sozinho.** Se o `audit_log` guardasse o nome do produto no antes/depois, por que isso seria um problema mesmo sem ser dado pessoal, e o que a lista de ações em TypeScript impede de acontecer no futuro?

## Com minhas palavras

