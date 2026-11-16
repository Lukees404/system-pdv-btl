# M2 · Etapa 8 — Telas do catálogo

**1. O que foi feito.** Criei as telas de Produtos (lista com busca, cadastro, edição, arquivar/reativar), Categorias e Serviços, e três itens novos no menu. O preço é digitado em reais (`12,50`) e vira centavos; os campos fiscais ficam recolhidos. Cada tela chama uma Server Action fina, que confere a sessão e entrega o trabalho a `performSaveProduct` e afins, no módulo `catalog`. 25 testes novos (leitura dos formulários e ações com banco real). Usei o app de verdade: erro de preço, nome duplicado, busca "COLEIRA man", arquivar e reativar.

**2. Por que assim.** A autorização está em **toda** ação, não só no botão escondido ([RNF-SEG-04](../../docs/03-requisitos-nao-funcionais.md), [ADR-019](../../docs/04-decisoes-de-arquitetura.md)). Conversão de texto para dinheiro fica fora do componente e testada ([RN-DIN-01](../../docs/01-regras-de-negocio.md)); a regra de negócio continua nos casos de uso. A busca usa `GET` e a URL (`?q=`), então funciona sem JavaScript extra e dá para copiar o link. O `catalog` não importa o `auth`: quem junta os dois é `src/lib/catalog.ts`, que passa só o id do usuário para a auditoria ([RF-CAT-01…04, 06, 07](../../docs/02-requisitos-funcionais.md)).

**3. Termo novo: Server Action.** É uma função que roda no servidor e que o formulário chama direto, sem você escrever uma rota de API. Como qualquer pessoa pode tentar chamá-la sem passar pela tela, ela precisa conferir a sessão por conta própria.

**4. Pergunta para você responder sozinho.** Se a ação de arquivar produto não conferisse a sessão e só o botão estivesse escondido para quem não entrou, o que alguém poderia fazer, e por que o proxy (que só olha o cookie) não resolve isso?

## Com minhas palavras
