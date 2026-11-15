# M2 · Etapa 6 — Seed do catálogo

**1. O que foi feito.** Criei `src/config/business.ts` com as categorias iniciais (Alimentos, Brinquedos, Acessórios, Higiene) e os 7 serviços (consulta, vacinação, coleta de exames, limpeza de ouvido, raspado, atestado de viagem e a taxa de deslocamento), e o caso de uso `seedCatalog`, que `pnpm db:seed` chama. O seed só cria o que não existe, não mexe em preço editado e não recria serviço que o dono arquivou. Rodei duas vezes no banco local: `+4/+7` e depois `+0/+0`. 11 testes novos; uma mutação (ignorar arquivados) foi pega.

**2. Por que assim.** O que é específico do negócio fica isolado num arquivo só, para copiar o sistema para outro cliente sem caçar valores espalhados ([ADR-017](../../docs/04-decisoes-de-arquitetura.md)). Os valores são **sugestão**: viram dados editáveis no banco ([RN-CAT-07](../../docs/01-regras-de-negocio.md), [RN-SER-01](../../docs/01-regras-de-negocio.md)), então um seed que sobrescrevesse apagaria o trabalho do dono. Os preços começam em 0 porque os reais não estão nos documentos ([OQ-31](../../docs/09-perguntas-em-aberto.md)). Só existe uma taxa de deslocamento ([RN-SER-03](../../docs/01-regras-de-negocio.md)).

**3. Termo novo: idempotência.** Uma operação é idempotente quando repeti-la tem o mesmo efeito de fazê-la uma vez. É o que torna seguro rodar o seed de novo (num deploy, numa dúvida, por engano) sem duplicar nem estragar nada.

**4. Pergunta para você responder sozinho.** O dono arquivou o serviço "Raspado" e rodou o seed de novo. Se o seed olhasse só os serviços ativos, o que aconteceria, e por que o nome ficar livre ao arquivar (RN-CAT-02) torna isso um risco real?

**Limite conhecido.** Uma categoria que o dono **excluiu** (só vazias podem ser) volta no próximo seed, porque nada registra que ela foi excluída. Para o uso previsto (rodar no deploy) isso é aceitável; se virar problema, o seed passa a rodar só uma vez.

## Com minhas palavras

