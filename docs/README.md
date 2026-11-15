# Documentação do PDV Pet Shop

> Fonte da verdade do projeto. **Código segue a documentação**: se algo precisa mudar, mude o documento primeiro (em commit próprio) e depois o código.

## Índice

| Doc | Conteúdo | Quando ler |
|---|---|---|
| [00-contexto.md](00-contexto.md) | Negócio, usuários, objetivos, não-objetivos, glossário, premissas | Sempre, ao começar |
| [01-regras-de-negocio.md](01-regras-de-negocio.md) | Regras `RN-*` (o que o sistema deve respeitar) | Antes de implementar qualquer lógica |
| [02-requisitos-funcionais.md](02-requisitos-funcionais.md) | Requisitos `RF-*` com critérios de aceitação e mapa de telas | Antes de escrever testes e telas |
| [03-requisitos-nao-funcionais.md](03-requisitos-nao-funcionais.md) | Requisitos `RNF-*` (desempenho, segurança, LGPD, backup...) | Ao desenhar infraestrutura e revisar PRs |
| [04-decisoes-de-arquitetura.md](04-decisoes-de-arquitetura.md) | ADRs, estrutura de pastas, fronteiras de módulos, algoritmos críticos | Antes de criar módulos/arquivos |
| [05-modelo-de-dados.md](05-modelo-de-dados.md) | Entidades, campos, constraints, índices, invariantes | Antes de escrever schema/migrações |
| [06-fiscal-fase2.md](06-fiscal-fase2.md) | NFC-e, NFS-e, provedores, pré-requisitos, preparação na Fase 1 | Ao tocar em campos fiscais ou iniciar a Fase 2 |
| [07-estrategia-de-testes.md](07-estrategia-de-testes.md) | TDD, pirâmide, ferramentas, convenções, Definition of Done | Antes de cada ciclo de implementação |
| [08-roadmap.md](08-roadmap.md) | Marcos M0–M11, escopo, testes-chave e critérios de saída | Para saber o que fazer agora |
| [09-perguntas-em-aberto.md](09-perguntas-em-aberto.md) | Dúvidas `OQ-*`, suposições padrão e responsável | Quando algo estiver ambíguo |

## Convenções

- **IDs estáveis e rastreáveis.** `RN-` regra de negócio, `RF-` requisito funcional, `RNF-` não funcional, `ADR-` decisão de arquitetura, `OQ-` pergunta em aberto. IDs nunca são reutilizados; itens removidos ficam marcados como `(descontinuado)`.
- **Rastreabilidade em testes.** Todo teste cita o(s) ID(s) que cobre no título, por exemplo `it('[RN-PAG-03] calcula troco só sobre o dinheiro', ...)`.
- **Origem de cada regra**, quando relevante: `[Confirmado]` (dito pelo desenvolvedor/clientes), `[Pesquisa]` (prática observada em PDVs reais), `[Decisão]` (decisão de projeto), `[Suposição]` (assumido; ver `09`).
- **Prioridade (MoSCoW):** `M` obrigatório no MVP (Fase 1), `S` desejável, `C` opcional.
- **Idioma:** documentação e interface em pt-BR; código, identificadores e commits em inglês (ADR-014).
- **Ambiguidade:** nunca decida sozinho. Consulte `09`; se a suposição padrão resolver, siga-a e registre no PR; se não, pergunte ao desenvolvedor.

## Fases

- **Fase 1 (MVP):** PDV sem emissão fiscal — catálogo, importação, clientes/pets, estoque, caixa, vendas, devoluções, relatórios.
- **Fase 2:** emissão de NFC-e (produtos) e NFS-e Padrão Nacional (serviços) por provedor externo. A Fase 1 já deixa o modelo preparado.

## Status do conjunto

Versão `0.2` — M0 e M1 concluídos e em produção; M2 (catálogo) em andamento (ver `08`). Pendências de validação: regras de negócio com os clientes (`OQ` marcadas *Primos*) e pontos fiscais com o contador (`OQ` marcadas *Contador*).
