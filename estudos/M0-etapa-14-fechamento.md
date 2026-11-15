# M0 · Etapa 14 — Fechamento do marco

**1. O que foi feito.** Troquei a seção "Comandos" do `CLAUDE.md` pelos comandos reais, criei `pnpm check` (lint, formato, tipos, fronteiras e testes unitários, sem banco) e atualizei `docs/04`, `05`, `07` e `08` com o que mudou. Rodei a Definition of Done: 161 testes unitários, 12 de integração, 4 E2E, build, rastreabilidade e fim de linha, tudo verde.

**2. Por que assim.** Se o código muda, a documentação muda no mesmo trabalho ([docs/07 §9](../docs/07-estrategia-de-testes.md), [RNF-MAN-04](../docs/03-requisitos-nao-funcionais.md)). Marquei o M0 como "◐" (e não ☑) em [docs/08](../docs/08-roadmap.md) porque o critério de saída ainda exige CI verde no GitHub e o preview respondendo `/api/health`: dizer que está pronto sem isso seria mentir para o próximo "eu".

**3. Termo novo: Definition of Done (DoD).** A lista combinada do que "terminado" significa (testes vistos falhando antes, tudo verde, docs atualizadas...). Ela impede o "quase pronto" que vira dívida.

**4. Pergunta para você responder sozinho.** Das duas pendências do M0 (CI no GitHub e deploy), qual você faria primeiro, e por que a outra depende dela?

## Com minhas palavras

