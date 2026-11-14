# 01 — Regras de Negócio

Cada regra tem ID estável. Origem: `[Confirmado]` `[Pesquisa]` `[Decisão]` `[Suposição]` (ver `README.md`). Toda regra precisa de ao menos um teste que cite o ID. Suposições referenciam `OQ-*` em `09`.

## 1. Valores monetários e quantidades (RN-DIN)

- **RN-DIN-01** `[Decisão]` Todo valor monetário é **inteiro em centavos** (BRL). Proibido `float`/`number` fracionário para dinheiro. Exibição: `R$ 1.234,56`.
- **RN-DIN-02** `[Decisão]` Desconto percentual = `round_half_up(subtotal × pct / 100)` em centavos, calculado **uma vez** sobre o subtotal da venda.
- **RN-DIN-03** `[Confirmado]` Produtos são vendidos **por unidade**: quantidade inteira ≥ 1. Serviços: quantidade inteira ≥ 1.
- **RN-DIN-04** `[Suposição OQ-14]` O total da venda deve ser **> 0** para finalizar.
- **RN-DIN-05** `[Decisão]` Rateios (desconto entre itens, reembolso parcial) usam o método do **maior resto**, de forma que a soma das partes seja exatamente igual ao total.

## 2. Catálogo (RN-CAT)

- **RN-CAT-01** `[Decisão]` Produto: nome (1–120 caracteres), preço de venda ≥ 0 obrigatório, custo ≥ 0 **opcional** (sem custo, margem é "N/D"), categoria opcional ("Sem categoria"), estoque mínimo ≥ 0 (0 = sem alerta).
- **RN-CAT-02** `[Suposição OQ-12]` Nome único entre produtos **ativos**, comparando sem acento e sem diferença de caixa.
- **RN-CAT-03** `[Confirmado]` Código de barras é **opcional**; se informado, é único (incluindo arquivados). A busca por nome precisa ser rápida e tolerante (sem acento, parcial).
- **RN-CAT-04** `[Decisão]` Produtos e serviços **nunca são excluídos fisicamente**: são **arquivados** (`archived_at`) e podem ser reativados. Arquivados não aparecem na venda, mas aparecem em relatórios históricos.
- **RN-CAT-05** `[Decisão]` Alterar preço/custo vale só para vendas **futuras**; vendas passadas mantêm o snapshot (RN-VEN-08).
- **RN-CAT-06** `[Decisão]` Foto opcional (jpeg/png/webp, até 5 MB), redimensionada no envio (lado maior ≤ 800 px).
- **RN-CAT-07** `[Decisão]` Categorias são dados editáveis no banco (nome único sem diferença de caixa/acento). O seed inicial vem de `config/business.ts` e é apenas sugestão.

## 3. Serviços (RN-SER)

- **RN-SER-01** `[Confirmado]` Serviço: nome, preço padrão ≥ 0. Seed inicial: consulta, vacinação, coleta de exames, limpeza de ouvido, raspado, atestado de viagem, **taxa de deslocamento**.
- **RN-SER-02** `[Decisão]` O preço **praticado** na venda pode diferir do padrão; ambos são gravados (`unit_price` e `unit_list_price`).
- **RN-SER-03** `[Confirmado]` A **taxa de deslocamento** é um serviço especial (`is_displacement_fee`), único no sistema, com valor informado por atendimento (padrão editável).
- **RN-SER-04** `[Suposição OQ-07]` A taxa de deslocamento só pode ser adicionada em vendas de canal `HOME_VISIT`.
- **RN-SER-05** `[Decisão]` Serviços **não movimentam estoque**.
- **RN-SER-06** `[Suposição OQ-08]` Venda que contém serviço **exige cliente (tutor)**; pet é opcional, porém sugerido.
- **RN-SER-07** `[Decisão]` Serviços não têm custo; margem e custo só consideram produtos.

## 4. Vendas (RN-VEN)

- **RN-VEN-01** `[Decisão]` Só é possível **finalizar** venda com **sessão de caixa aberta** (RN-CAI-03). Montar carrinho/espera independe do caixa.
- **RN-VEN-02** `[Suposição OQ-06]` Toda venda tem canal `STORE` ou `HOME_VISIT`. `HOME_VISIT` exige cliente e endereço de atendimento (padrão: endereço do cadastro, editável na venda).
- **RN-VEN-03** `[Decisão]` Itens são produtos ou serviços, podendo ser **misturados** na mesma venda. Cada item: quantidade inteira ≥ 1, preço unitário praticado ≥ 0.
- **RN-VEN-04** `[Confirmado]` Pagamentos aceitos: ver RN-PAG.
- **RN-VEN-05** `[Suposição OQ-09]` Desconto: **um por venda**, em valor (centavos) ou percentual (0–100), nunca tornando o total negativo; sem limite máximo e com motivo opcional.
- **RN-VEN-06** `[Decisão]` `subtotal = Σ(quantidade × preço unitário)`; `total = subtotal − desconto`.
- **RN-VEN-07** `[Decisão]` A finalização é **atômica**: valida estoque, grava venda, itens, pagamentos e movimentos de estoque **na mesma transação**. Falhou, nada é gravado.
- **RN-VEN-08** `[Decisão]` Cada item guarda **snapshot**: nome, preço de tabela, preço praticado, custo, parcela do desconto (RN-DIN-05), total líquido e dados fiscais.
- **RN-VEN-09** `[Decisão]` **Idempotência:** o cliente gera uma `idempotencyKey` (UUID) ao abrir o checkout. Repetir a finalização com a mesma chave devolve a **mesma venda**, sem duplicar efeitos.
- **RN-VEN-10** `[Decisão]` Cada venda concluída recebe um `number` sequencial crescente e único; lacunas são aceitáveis.
- **RN-VEN-11** `[Decisão]` Venda **concluída é imutável** (itens, preços, pagamentos). Correção só por devolução (RN-DEV).
- **RN-VEN-12** `[Pesquisa]` **Venda em espera:** salva o carrinho sem baixar estoque nem tocar o caixa; qualquer usuário pode retomar ou descartar; limite de 10 simultâneas `[Suposição OQ-09]`. Não reserva estoque.
- **RN-VEN-13** `[Decisão]` Cliente é **opcional** em vendas só de produtos (consumidor final). CPF na nota é opcional (informado na venda ou vindo do cliente).
- **RN-VEN-14** `[Decisão]` A venda grava o **vendedor** (usuário). Data/hora vem do **servidor** (UTC); não editável. Exibição em `America/Manaus`.
- **RN-VEN-15** `[Decisão]` Estoque é verificado **apenas na finalização**, nunca ao adicionar ao carrinho (RN-EST-08).

## 5. Pagamentos (RN-PAG)

- **RN-PAG-01** `[Confirmado]` Formas: `CASH` (dinheiro), `DEBIT`, `CREDIT`, `PIX`.
- **RN-PAG-02** `[Pesquisa]` A venda aceita **uma ou mais** formas (pagamento misto).
- **RN-PAG-03** `[Decisão]` Só **dinheiro** gera troco: `troco = dinheiro_recebido − (total − Σ pagamentos não-dinheiro)`, com `troco ≥ 0`. Pagamentos não-dinheiro nunca excedem o valor restante.
- **RN-PAG-04** `[Decisão]` Cada pagamento grava o **valor aplicado**; no dinheiro, também o **valor recebido** e o **troco**.
- **RN-PAG-05** `[Confirmado]` Cartão e Pix são **registro manual**, sem integração: o vendedor atesta o recebimento ao finalizar.
- **RN-PAG-06** `[Confirmado]` Sem fiado nem parcelamento próprio: a venda só finaliza quando **totalmente paga**.
- **RN-PAG-07** `[Suposição OQ-13]` O número de parcelas do crédito não é registrado.

## 6. Estoque (RN-EST)

- **RN-EST-01** `[Decisão]` O saldo de um produto = `Σ quantity_delta` dos movimentos (**livro de estoque**). `products.stock_qty` é um **cache** mantido **na mesma transação** de cada movimento; uma verificação de consistência detecta divergência.
- **RN-EST-02** `[Decisão]` Saldo **nunca negativo**. A finalização falha, informando os itens com saldo insuficiente.
- **RN-EST-03** `[Decisão]` Tipos de movimento: `INITIAL`, `PURCHASE_IN`, `SALE_OUT`, `RETURN_IN`, `ADJUSTMENT`, `LOSS`.
- **RN-EST-04** `[Decisão]` Movimentos são **imutáveis**; correção = novo movimento.
- **RN-EST-05** `[Decisão]` `ADJUSTMENT` e `LOSS` exigem **motivo** (≥ 3 caracteres) e quantidade ≠ 0; `LOSS` é sempre negativa.
- **RN-EST-06** `[Suposição OQ-11]` Entrada de compra (`PURCHASE_IN`): quantidade > 0; custo unitário opcional que passa a ser o **custo atual** do produto (último custo, sem custo médio).
- **RN-EST-07** `[Decisão]` Devolução de produto retorna ao estoque (`RETURN_IN`), exceto se marcada como avariado, quando gera `LOSS`.
- **RN-EST-08** `[Decisão]` Baixa de estoque ocorre **somente** na finalização da venda.
- **RN-EST-09** `[Decisão]` Concorrência entre aparelhos: baixa por **UPDATE condicional atômico** (ADR-008). Duas vendas disputando a última unidade: uma sucede, a outra falha com erro de estoque.
- **RN-EST-10** `[Decisão]` Estoque mínimo: `stock_qty ≤ min_stock` e `min_stock > 0` aciona alerta (RN-REL-05).
- **RN-EST-11** `[Decisão]` Cada movimento grava `balance_after`, usuário e referência (venda, devolução, importação ou manual).
- **RN-EST-12** `[Suposição OQ-10]` Insumos usados em serviços (ex.: vacina) **não** baixam estoque na Fase 1.

## 7. Caixa (RN-CAI)

- **RN-CAI-01** `[Suposição OQ-25]` Um **único caixa lógico**; no máximo **uma sessão aberta** por vez (garantido por índice único parcial no banco).
- **RN-CAI-02** `[Decisão]` Abertura exige valor inicial ≥ 0; grava usuário e horário.
- **RN-CAI-03** `[Decisão]` Finalizar vendas, registrar devoluções e movimentos de caixa só com sessão aberta.
- **RN-CAI-04** `[Pesquisa]` **Suprimento** (entrada) e **sangria** (saída): valor > 0, motivo obrigatório; sangria não pode exceder o dinheiro esperado em gaveta.
- **RN-CAI-05** `[Suposição OQ-05]` **Dinheiro esperado em gaveta** = `abertura + Σ dinheiro líquido (recebido − troco) das vendas STORE + suprimentos − sangrias − devoluções pagas em dinheiro`. O dinheiro recebido em vendas `HOME_VISIT` **não** entra na gaveta; aparece em linha separada ("dinheiro com o atendente") no fechamento.
- **RN-CAI-06** `[Pesquisa]` **Fechamento:** o usuário informa o dinheiro contado; o sistema grava esperado, contado e diferença. Diferença ≠ 0 exige observação. Totais por forma de pagamento são exibidos para conferência com maquininha e extrato Pix (informativo).
- **RN-CAI-07** `[Decisão]` Não é possível fechar com vendas em espera: devem ser finalizadas ou descartadas.
- **RN-CAI-08** `[Decisão]` Sessão fechada é imutável e **não reabre**.
- **RN-CAI-09** `[Decisão]` O fechamento gera relatório consultável (e compartilhável como PDF/tela).
- **RN-CAI-10** `[Suposição OQ-06]` Atendimento domiciliar fora do horário exige abrir o caixa antes de finalizar a venda.

## 8. Devoluções (RN-DEV)

- **RN-DEV-01** `[Pesquisa]` Devolução referencia a venda original; por item, `quantidade ≤ vendida − já devolvida`.
- **RN-DEV-02** `[Decisão]` Motivo obrigatório.
- **RN-DEV-03** `[Decisão]` Valor devolvido por item = `net_total` do item (já com desconto rateado) proporcional à quantidade devolvida; a **última unidade** recebe o resíduo para que o acumulado nunca exceda o `net_total` (RN-DIN-05).
- **RN-DEV-04** `[Decisão]` Forma do reembolso: `CASH` (sai da gaveta; exige caixa aberto) ou `EXTERNAL` (estorno na maquininha/Pix, feito fora do sistema e apenas registrado; não afeta a gaveta).
- **RN-DEV-05** `[Decisão]` Produto devolvido segue RN-EST-07; serviço devolvido não mexe em estoque.
- **RN-DEV-06** `[Decisão]` Devolução é imutável.
- **RN-DEV-07** `[Suposição OQ-15]` Na receita líquida, a devolução conta na **data da devolução** (não retroage ao dia da venda).
- **RN-DEV-08** `[Decisão]` Venda com nota autorizada: cancelamento/devolução fiscal segue o fluxo da Fase 2 (`06-fiscal-fase2.md`).

## 9. Clientes e pets (RN-CLI)

- **RN-CLI-01** `[Decisão]` Tutor: nome obrigatório (2–120); telefone opcional, normalizado (E.164, validação de 10–11 dígitos BR); CPF opcional, validado por dígitos verificadores, único se informado; endereço opcional (logradouro, número, bairro, complemento, referência, cidade, UF, CEP).
- **RN-CLI-02** `[Decisão]` Pet: nome obrigatório; espécie (`DOG`, `CAT`, `OTHER`); raça, nascimento e observações opcionais; pertence a um tutor; tutor pode ter vários pets.
- **RN-CLI-03** `[Decisão]` Busca por nome, telefone, CPF e nome do pet.
- **RN-CLI-04** `[Decisão]` **LGPD — anonimização:** a pedido do titular, nome vira "Cliente anonimizado", e telefone, CPF, endereço e dados dos pets são removidos; vendas e relatórios permanecem sem dados pessoais. Ação irreversível e auditada (RNF-LGPD-04).
- **RN-CLI-05** `[Suposição OQ-16]` Coleta mínima para as finalidades "atendimento" e "emissão de nota"; sem consentimento digital no MVP.
- **RN-CLI-06** `[Decisão]` Cadastro avisa possível **duplicata** (mesmo telefone ou CPF) sem bloquear quando for telefone.

## 10. Importação de planilha (RN-IMP)

- **RN-IMP-01** `[Confirmado]` Origem: planilha atual do cliente. Formatos: CSV (UTF-8, separador `;` ou `,`) e XLSX (primeira aba); até 5 MB e 5.000 linhas.
- **RN-IMP-02** `[Decisão]` O usuário **mapeia colunas** do arquivo para campos (nome, preço, custo, estoque, categoria, código de barras). Colunas reais da planilha: `OQ-01`.
- **RN-IMP-03** `[Decisão]` Valores em pt-BR são aceitos (`12,50`, `R$ 12,50`, `1.234,56`) e convertidos para centavos. Estoque é inteiro ≥ 0 (vazio = 0).
- **RN-IMP-04** `[Decisão]` Validação por linha: nome obrigatório; preço e custo válidos; estoque inteiro ≥ 0; código de barras único no arquivo e no banco. Categoria inexistente é **criada** (informado na prévia).
- **RN-IMP-05** `[Decisão]` **Prévia sem gravar**: contagem de criar / atualizar / ignorar / erro, com motivo por linha. Nada é gravado até a confirmação.
- **RN-IMP-06** `[Decisão]` Correspondência com produto existente: código de barras; na falta, nome normalizado. Política escolhida pelo usuário: **ignorar** (padrão) ou **atualizar preço/custo**. O estoque do arquivo **nunca sobrescreve** estoque de produto existente (evita zerar o estoque real); só produtos **novos** recebem estoque, via movimento `INITIAL`.
- **RN-IMP-07** `[Decisão]` A confirmação grava só as linhas válidas, em **uma transação**, e registra um lote (hash do arquivo, usuário, contagens). Reimportar o mesmo hash gera aviso.
- **RN-IMP-08** `[Decisão]` Erros são exportáveis em CSV.

## 11. Relatórios (RN-REL)

- **RN-REL-01** `[Decisão]` Períodos e "dia" seguem `America/Manaus`; timestamps são armazenados em UTC.
- **RN-REL-02** `[Decisão]` Receita líquida = vendas concluídas − devoluções (RN-DEV-07).
- **RN-REL-03** `[Decisão]` Margem = `Σ (net_total − custo_snapshot × quantidade)` apenas para itens de **produto com custo**; itens sem custo e serviços ficam fora do cálculo e são sinalizados como "N/D".
- **RN-REL-04** `[Decisão]` "Mais vendidos": ranking por quantidade e por receita no período.
- **RN-REL-05** `[Decisão]` Estoque baixo: `min_stock > 0` e `stock_qty ≤ min_stock`.
- **RN-REL-06** `[Decisão]` Relatórios financeiros separam receita por forma de pagamento e por canal.

## 12. Acesso e auditoria (RN-ACE)

- **RN-ACE-01** `[Confirmado]` Acesso somente autenticado; os 2 usuários têm permissões iguais. A tabela de usuários tem `role` (hoje todos `OWNER`) para evolução futura.
- **RN-ACE-02** `[Decisão]` Auditoria (`audit_log`) registra: venda finalizada, devolução, entrada/ajuste/perda de estoque, abertura/fechamento de caixa, suprimento/sangria, alteração de preço/custo, arquivamento/reativação, importação, anonimização, criação de usuário, troca de senha.
- **RN-ACE-03** `[Decisão]` `audit_log` é **append-only** (o usuário do banco da aplicação não tem `UPDATE`/`DELETE`) e **sem dados pessoais** (apenas IDs e diferenças de valores não pessoais).
- **RN-ACE-04** `[Suposição OQ-17]` Sessão persistente por 30 dias no dispositivo; trocar a senha invalida as demais sessões.
- **RN-ACE-05** `[Decisão]` Senha com ≥ 10 caracteres; hash com argon2id (ou bcrypt); bloqueio temporário após 5 falhas seguidas (RNF-SEG-03).
- **RN-ACE-06** `[Decisão]` Usuários são criados pelo desenvolvedor (script/admin), sem autocadastro.

## 13. Preparação fiscal (RN-FIS) — Fase 1

- **RN-FIS-01** `[Decisão]` A Fase 1 **não emite** documentos fiscais. `sales.fiscal_status` nasce `NOT_ISSUED`.
- **RN-FIS-02** `[Decisão]` Campos fiscais opcionais: produto (`ncm` 8 dígitos, `cest`, `cfop` 4 dígitos, `csosn` 3 dígitos, `origin`, `unit`), serviço (`fiscal_service_code`). Quando preenchidos, o formato é validado.
- **RN-FIS-03** `[Decisão]` Cada item da venda grava `fiscal_snapshot` (JSON) dos dados fiscais vigentes no momento da venda.
- **RN-FIS-04** `[Decisão]` CPF na venda é opcional e validado por dígitos verificadores.
- **RN-FIS-05** `[Decisão]` (Fase 2) A emissão fiscal **nunca bloqueia** a conclusão da venda: falha de nota deixa o documento `PENDING/REJECTED` com nova tentativa e alerta.
- **RN-FIS-06** `[Decisão]` Certificado A1 e CSC são segredos: nunca em repositório, logs ou banco da aplicação em texto puro (ver `06`).
