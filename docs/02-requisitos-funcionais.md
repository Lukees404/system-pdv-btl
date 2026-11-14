# 02 — Requisitos Funcionais

Formato: **ID — título** `[Prioridade]` · Regras: `RN-*` · critérios de aceitação em *Dado / Quando / Então*. Cada critério vira, no mínimo, um teste (ver `07`). Prioridade: `M` obrigatório no MVP, `S` desejável, `C` opcional.

## 1. Autenticação e conta (RF-AUT)

**RF-AUT-01 — Login** `[M]` · RN-ACE-01, RN-ACE-05
- Dado usuário ativo, quando informa e-mail e senha corretos, então acessa o sistema e a sessão persiste por 30 dias no dispositivo.
- Dado credenciais incorretas, quando tenta entrar, então vê mensagem genérica (sem revelar se o e-mail existe).
- Dado 5 falhas seguidas, quando tenta de novo, então fica bloqueado temporariamente.

**RF-AUT-02 — Logout** `[M]` · Dado sessão ativa, quando sai, então a sessão é invalidada no servidor.

**RF-AUT-03 — Trocar senha** `[M]` · RN-ACE-04/05
- Dado usuário logado, quando troca a senha informando a atual e uma nova válida (≥ 10 caracteres), então as demais sessões são invalidadas e a ação é auditada.

**RF-AUT-04 — Criar usuário (script do desenvolvedor)** `[M]` · RN-ACE-06 · Existe comando documentado para criar usuário `OWNER`; não há tela de autocadastro.

## 2. Catálogo (RF-CAT)

**RF-CAT-01 — Cadastrar produto** `[M]` · RN-CAT-01/02/03, RN-FIS-02
- Dado dados válidos, quando salva, então o produto é criado ativo com estoque 0 (ou estoque inicial informado via movimento `INITIAL`).
- Dado nome duplicado entre ativos, quando salva, então recebe erro claro (RN-CAT-02).
- Dado código de barras já usado, então recebe erro.

**RF-CAT-02 — Editar produto** `[M]` · RN-CAT-05, RN-ACE-02 · Alteração de preço/custo é auditada (valor anterior e novo); não altera vendas passadas.

**RF-CAT-03 — Arquivar/reativar produto** `[M]` · RN-CAT-04 · Arquivado some da busca da venda e continua nos relatórios.

**RF-CAT-04 — Listar e buscar produtos** `[M]` · RN-CAT-03
- Dado 5.000 produtos, quando busca "coleira", então retorna resultados parciais, sem diferença de acento/caixa, ordenados por relevância, em tempo dentro de RNF-DES-01.
- Dado código de barras digitado/bipado exato, então o produto é o primeiro resultado.

**RF-CAT-05 — Foto do produto** `[S]` · RN-CAT-06 · Envio com validação de tipo/tamanho e redimensionamento.

**RF-CAT-06 — Categorias (CRUD)** `[M]` · RN-CAT-07 · Nome único; renomear atualiza produtos; excluir só se vazia.

**RF-CAT-07 — Serviços (CRUD)** `[M]` · RN-SER-01/03 · Seed inicial dos serviços e da taxa de deslocamento; só existe uma taxa de deslocamento.

## 3. Importação de planilha (RF-IMP)

**RF-IMP-01 — Enviar arquivo e mapear colunas** `[M]` · RN-IMP-01/02
- Dado CSV/XLSX dentro dos limites, quando envia, então o sistema lista colunas detectadas e permite mapeá-las.
- Dado arquivo > 5 MB ou > 5.000 linhas, então recusa com mensagem clara.

**RF-IMP-02 — Prévia da importação** `[M]` · RN-IMP-03/04/05/06
- Dado mapeamento definido, quando gera a prévia, então mostra quantos criar/atualizar/ignorar/erro, com motivo por linha, e **nada é gravado**.
- Dado `12,50`, `R$ 12,50` e `1.234,56`, então os preços viram 1250, 1250 e 123456 centavos.

**RF-IMP-03 — Confirmar importação** `[M]` · RN-IMP-06/07
- Dado prévia confirmada, quando grava, então cria/atualiza só linhas válidas numa transação e registra o lote.
- Dado produto existente, então o estoque do arquivo **não** sobrescreve o estoque atual.
- Dado o mesmo arquivo reenviado, então exibe aviso de reimportação.

**RF-IMP-04 — Exportar erros** `[S]` · RN-IMP-08 · CSV com linha, campo e motivo.

## 4. Clientes e pets (RF-CLI)

**RF-CLI-01 — Cadastrar/editar tutor** `[M]` · RN-CLI-01/06 · Valida CPF e telefone; avisa duplicata.

**RF-CLI-02 — Cadastrar/editar pets do tutor** `[M]` · RN-CLI-02.

**RF-CLI-03 — Buscar clientes** `[M]` · RN-CLI-03 · Por nome, telefone, CPF ou nome do pet; também dentro da venda (seleção rápida).

**RF-CLI-04 — Histórico do cliente** `[S]` · Lista vendas e atendimentos do tutor/pet.

**RF-CLI-05 — Anonimizar cliente (LGPD)** `[M]` · RN-CLI-04
- Dado tutor com vendas, quando anonimizado, então dados pessoais e de pets são removidos, as vendas permanecem e a ação é auditada.

## 5. Estoque (RF-EST)

**RF-EST-01 — Entrada de compra** `[M]` · RN-EST-06 · Quantidade > 0; custo opcional atualiza custo atual do produto.

**RF-EST-02 — Ajuste de estoque** `[M]` · RN-EST-05 · Exige motivo; saldo resultante não pode ficar negativo.

**RF-EST-03 — Registrar perda/avaria** `[M]` · RN-EST-05 · Movimento `LOSS` negativo com motivo.

**RF-EST-04 — Histórico de movimentos do produto** `[M]` · RN-EST-04/11 · Lista cronológica com tipo, delta, saldo após, usuário e referência.

**RF-EST-05 — Alerta de estoque baixo** `[M]` · RN-EST-10 · Aparece no início e em relatório.

**RF-EST-06 — Inventário por contagem** `[C]` · RN-EST-05 · Informa quantidade contada; sistema gera o ajuste (delta).

## 6. Caixa (RF-CAI)

**RF-CAI-01 — Abrir caixa** `[M]` · RN-CAI-01/02
- Dado nenhuma sessão aberta, quando abre com valor inicial, então a sessão fica `OPEN`.
- Dado já existir sessão aberta, quando tenta abrir outra, então recebe erro (inclusive sob concorrência de dois aparelhos).

**RF-CAI-02 — Suprimento e sangria** `[M]` · RN-CAI-04
- Dado sangria maior que o dinheiro esperado em gaveta, então é recusada.
- Dado motivo vazio, então é recusada.

**RF-CAI-03 — Fechar caixa** `[M]` · RN-CAI-05/06/07/08
- Dado vendas em espera, quando tenta fechar, então é bloqueado listando as pendentes.
- Dado dinheiro contado diferente do esperado, quando fecha, então exige observação e registra diferença (sobra/falta).
- Dado sessão fechada, então não pode ser reaberta nem alterada.

**RF-CAI-04 — Visão do caixa em tempo real** `[M]` · RN-CAI-05 · Mostra esperado em gaveta, totais por forma de pagamento e por canal, movimentos da sessão.

**RF-CAI-05 — Histórico de sessões** `[S]` · RN-CAI-09 · Lista e detalhe, com relatório de fechamento compartilhável.

## 7. Vendas (RF-VEN)

**RF-VEN-01 — Montar carrinho** `[M]` · RN-VEN-03/15, RN-DIN-03
- Dado busca por nome/código, quando seleciona, então o item entra no carrinho com quantidade 1; tocar de novo incrementa.
- Dado quantidade 0 ou fracionada, então é recusada.
- Dado produto sem estoque suficiente, então o carrinho **permite** montar, mas a finalização avisa (RN-VEN-15).

**RF-VEN-02 — Editar/remover itens e preço praticado** `[M]` · RN-SER-02 · Preço praticado é editável por item; o preço de tabela é preservado.

**RF-VEN-03 — Desconto** `[M]` · RN-VEN-05, RN-DIN-02/05
- Dado desconto percentual 10% sobre subtotal 1.999 centavos, então desconto = 200 (half-up).
- Dado desconto maior que o subtotal, então é recusado.

**RF-VEN-04 — Vincular cliente e pet** `[M]` · RN-VEN-13, RN-SER-06 · Obrigatório se houver serviço.

**RF-VEN-05 — Canal e endereço do atendimento** `[M]` · RN-VEN-02, RN-SER-04 · `HOME_VISIT` exige cliente e endereço; taxa de deslocamento só neste canal.

**RF-VEN-06 — Pagamento único ou misto, com troco** `[M]` · RN-PAG-01…07
- Dado total 4.500 e dinheiro recebido 5.000, então troco = 500.
- Dado total 10.000 pago 6.000 Pix + dinheiro recebido 5.000, então dinheiro aplicado = 4.000 e troco = 1.000.
- Dado pagamentos que não cobrem o total, então não finaliza.
- Dado pagamento não-dinheiro acima do restante, então é recusado.

**RF-VEN-07 — Finalizar venda** `[M]` · RN-VEN-01/07/08/09/10/11, RN-EST-02/09
- Dado carrinho válido e caixa aberto, quando finaliza, então grava venda, itens (com snapshot), pagamentos e movimentos `SALE_OUT` numa transação.
- Dado caixa fechado, então é bloqueado com orientação para abrir.
- Dado estoque insuficiente em algum item, então nada é gravado e o erro lista os itens.
- Dado dois toques/reenvios com a mesma `idempotencyKey`, então existe **uma** venda.
- Dado dois aparelhos finalizando a última unidade ao mesmo tempo, então só um sucede.
- Dado falha no meio da transação, então estoque, caixa e venda permanecem intactos.

**RF-VEN-08 — Comprovante não fiscal** `[S]` · `OQ-20` · Tela/PDF com itens, total, pagamentos e troco, identificado como **"Comprovante — sem valor fiscal"**; compartilhável. Na Fase 2 convive com o DANFE/XML.

**RF-VEN-09 — Venda em espera** `[M]` · RN-VEN-12
- Dado carrinho, quando suspende, então não há baixa de estoque nem efeito no caixa e qualquer usuário pode retomar.
- Dado 10 vendas em espera, quando tenta a 11ª, então é recusado.

**RF-VEN-10 — Consultar vendas** `[M]` · Filtros por período, vendedor, cliente, forma de pagamento e canal; detalhe com itens, pagamentos e devoluções.

## 8. Devoluções (RF-DEV)

**RF-DEV-01 — Registrar devolução (total ou parcial)** `[M]` · RN-DEV-01…06, RN-EST-07
- Dado venda com 3 unidades, quando devolve 1 e depois 2, então o reembolso acumulado é exatamente o `net_total` do item.
- Dado quantidade acima do saldo devolvível, então é recusada.
- Dado reembolso `CASH` com caixa fechado, então é recusado; `EXTERNAL` é apenas registrado.
- Dado produto avariado, então gera `LOSS`; senão, `RETURN_IN`.

## 9. Relatórios (RF-REL)

**RF-REL-01 — Resumo do dia** `[M]` · RN-REL-01/02/06 · Receita líquida, nº de vendas, ticket médio, por forma de pagamento e canal.

**RF-REL-02 — Vendas por período** `[M]` · RN-REL-01 · Dia/semana/mês em `America/Manaus`.

**RF-REL-03 — Mais vendidos** `[M]` · RN-REL-04.

**RF-REL-04 — Margem** `[M]` · RN-REL-03 · Apenas produtos com custo; "N/D" para os demais.

**RF-REL-05 — Estoque baixo** `[M]` · RN-REL-05.

**RF-REL-06 — Exportar CSV** `[S]` · Relatórios exportáveis em CSV (pt-BR).

## 10. Sistema (RF-SIS)

**RF-SIS-01 — Trilha de auditoria** `[S]` · RN-ACE-02/03 · Consulta filtrável por ação, entidade, usuário e período.

**RF-SIS-02 — Instalação como app (PWA)** `[M]` · RNF-USA-01 · Manifest, ícones e instalação em Android/iOS/desktop.

**RF-SIS-03 — Aviso de conexão** `[M]` · RNF-DIS-03 · Banner quando sem internet; finalização bloqueada; carrinho preservado localmente.

## 11. Mapa de telas

| Tela | Propósito | Requisitos |
|---|---|---|
| Login | Entrar | RF-AUT-01 |
| Início | Estado do caixa, atalhos (Nova venda, Caixa), alertas de estoque baixo, vendas em espera, resumo do dia | RF-CAI-04, RF-EST-05, RF-REL-01 |
| Caixa | Abrir/fechar, suprimento/sangria, movimentos | RF-CAI-01…05 |
| Venda | Carrinho, busca, desconto, cliente/pet, canal | RF-VEN-01…05, 09 |
| Pagamento | Formas, valores, troco, confirmar | RF-VEN-06/07 |
| Comprovante | Resumo pós-venda, compartilhar | RF-VEN-08 |
| Vendas | Lista, detalhe, devolução | RF-VEN-10, RF-DEV-01 |
| Produtos | Lista, formulário, arquivar, foto | RF-CAT-01…05 |
| Importar | Upload, mapeamento, prévia, confirmação | RF-IMP-01…04 |
| Serviços e categorias | CRUD | RF-CAT-06/07 |
| Clientes | Lista, detalhe, pets, anonimizar | RF-CLI-01…05 |
| Estoque | Entrada, ajuste, perda, histórico | RF-EST-01…06 |
| Relatórios | Painéis e exportação | RF-REL-01…06 |
| Conta | Trocar senha, sair | RF-AUT-02/03 |

**Navegação.** Celular: barra inferior (Venda, Caixa, Produtos, Clientes, Mais). Desktop: menu lateral e área de trabalho ampla. A tela de **Venda** é a principal e deve ser alcançável em um toque a partir de qualquer ponto.

**Esboço da tela de Venda (celular).**

```
┌──────────────────────────────┐
│ ☰  Nova venda      Caixa ● ab│
├──────────────────────────────┤
│ 🔍 Buscar produto ou serviço │
│ [Cliente: Maria  ▾] [Loja ▾] │
├──────────────────────────────┤
│ Sachê Gato 85g        2 × 4,50│
│                        9,00 ✕│
│ Coleira M             1 × 25  │
│                       25,00 ✕│
│ Consulta (domicílio)  1 × 120 │
│                      120,00 ✕│
├──────────────────────────────┤
│ Subtotal            154,00    │
│ Desconto  [ R$ | % ]  0,00    │
│ TOTAL               154,00    │
│ [ Em espera ]   [ PAGAR ▶ ]   │
└──────────────────────────────┘
```

Fluxo ideal: buscar → tocar nos itens → **Pagar** → escolher forma (e valor, se misto) → **Concluir**. Meta de toques em RNF-USA-02.
