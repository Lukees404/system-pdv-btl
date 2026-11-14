# 00 — Contexto

## 1. Visão geral

Sistema de PDV (ponto de venda) web, instalável como app (PWA), para um pet shop familiar que também realiza **atendimentos veterinários domiciliares**. Substitui o controle atual feito em planilha (vendas, estoque e conferência de caixa).

O projeto tem dois propósitos, nesta ordem:

1. **Entregar valor real** ao cliente (controle confiável de vendas, estoque e caixa, e emissão de nota fiscal na Fase 2).
2. **Servir de base (boilerplate) para futuros clientes** do desenvolvedor. A extração do boilerplate acontece *depois* do projeto funcionando, com base em uso real (ver ADR-001 e ADR-017). Não generalizar prematuramente.

## 2. Partes interessadas

| Papel | Quem | Interesse |
|---|---|---|
| Desenvolvedor / mantenedor | Pedro | Construir, manter, aprender, reaproveitar como base |
| Operadores (2 pessoas) | Familiares donos do negócio; um deles (Leo) faz hoje a conferência de caixa | Vender rápido, controlar estoque/caixa, emitir nota |
| Contador | Contador da empresa | Dados fiscais corretos; recebe XMLs/relatórios no fechamento |
| Clientes finais | Tutores de animais | Comprar produtos e contratar atendimentos; querem nota fiscal |

## 3. Perfil do negócio

- **Produtos:** itens para animais (sachês, brinquedos, coleiras etc.), vendidos **somente por unidade** (sem fracionamento) `[Confirmado]`. Código de barras nem sempre existe.
- **Serviços:** consulta, vacinação, coleta de exames, limpeza de ouvido, raspado, atestado de viagem; **taxa de deslocamento** cobrada nos atendimentos domiciliares `[Confirmado]`.
- **Regime fiscal:** Simples Nacional; possui inscrição estadual e certificado digital A1 (vence em ≈ 1 ano a partir de nov/2026 — confirmar data); **nunca emitiu nota** até agora `[Confirmado]`. Os clientes exigem nota fiscal.
- **Local:** Manaus/AM (fuso `America/Manaus`, UTC−4, sem horário de verão).
- **Pagamentos:** dinheiro, débito, crédito, Pix. Sem fiado `[Confirmado]`. Maquininha é independente do sistema.
- **Equipamentos:** até 3 celulares e 1 desktop usados em conjunto `[Confirmado]`.
- **Controle atual:** planilha; o Leo confere o caixa no fim do dia `[Confirmado]`.

## 4. Objetivos

| ID | Objetivo | Indicador de sucesso |
|---|---|---|
| G-01 | Registrar vendas de produtos e serviços de forma rápida no celular e no desktop | Venda típica concluída em poucos toques (RNF-USA-02) |
| G-02 | Manter estoque confiável, com histórico auditável | Saldo nunca negativo; toda variação tem movimento rastreável |
| G-03 | Substituir a conferência de caixa em planilha | Fechamento de caixa com esperado × contado × diferença |
| G-04 | Migrar dados existentes sem retrabalho | Importação da planilha de produtos com prévia e relatório de erros |
| G-05 | Dar visão de margem e desempenho | Relatórios de vendas, mais vendidos, margem e estoque baixo |
| G-06 | Estar pronto para emitir NFC-e/NFS-e (Fase 2) sem reescrever o banco | Campos e camada de integração fiscal previstos na Fase 1 |
| G-07 | Gerar base reaproveitável para outros clientes | Módulos com fronteiras claras; especificidades isoladas (ADR-017) |

## 5. Não-objetivos (Fase 1)

Emissão fiscal real; integração com maquininha/TEF; modo offline; agenda e rotas de atendimento; prontuário e carteira de vacinação do pet; fiado e parcelamento próprio; multi-loja; multi-cliente (multi-tenant); programa de fidelidade; consumo de insumos nos serviços (ex.: vacina baixando estoque); emissão de boleto/cobrança; e-commerce.

## 6. Anti-objetivos (o que seria falha mesmo "funcionando")

- Venda duplicada por toque duplo ou reenvio de rede.
- Estoque negativo ou divergente entre aparelhos.
- Total/troco errado por arredondamento.
- Caixa que não fecha e ninguém sabe por quê.
- Sistema que só o desenvolvedor consegue operar.
- Venda travada porque a nota fiscal falhou (Fase 2: venda e nota são desacopladas — RN-FIS-05).
- Vazamento de dados pessoais de tutores.

## 7. Usuários e dispositivos

- 2 usuários, **mesmas permissões** (donos) `[Confirmado]`; o modelo prevê o campo `role` para evolução (RN-ACE-01).
- Uso predominante em **celular** (loja e rua) e desktop (cadastros e relatórios).
- Conexão com internet **obrigatória** (ADR-010). Sem internet o sistema avisa e bloqueia a finalização de vendas; o carrinho em andamento não é perdido (RNF-DIS-03).

## 8. Premissas e restrições

- **P-01** Internet disponível na loja e, na maior parte do tempo, nos atendimentos externos.
- **P-02** Um único estabelecimento (1 CNPJ, 1 inscrição estadual).
- **P-03** O desenvolvedor mantém o sistema sozinho; simplicidade e tecnologia conhecida têm prioridade (ADR-001).
- **P-04** Orçamento de infraestrutura baixo; preferir planos gratuitos/baratos enquanto a carga for pequena (RNF-OPS-04).
- **P-05** Regras fiscais mudam com frequência; a integração fiscal é isolada por interface (ADR-013).
- **P-06** Tudo que for suposição está em `09-perguntas-em-aberto.md` com um valor padrão.

## 9. Glossário

| Termo | Definição |
|---|---|
| PDV | Ponto de venda: tela/sistema onde a venda é registrada |
| Tutor | Cliente dono do animal (entidade `customer`) |
| Pet | Animal do tutor (entidade `pet`) |
| Atendimento domiciliar | Serviço prestado no endereço do tutor; venda com canal `HOME_VISIT` |
| Canal | Origem da venda: `STORE` (loja) ou `HOME_VISIT` (atendimento externo) |
| Sessão de caixa | Período entre abertura e fechamento do caixa |
| Suprimento | Entrada de dinheiro na gaveta fora de vendas (ex.: troco inicial extra) |
| Sangria | Retirada de dinheiro da gaveta (ex.: depósito, pagamento) |
| Venda em espera | Venda suspensa, sem baixa de estoque nem movimento de caixa, para retomar depois |
| Devolução | Retorno de itens vendidos, com ou sem reembolso; nunca edita a venda original |
| Movimento de estoque | Registro imutável de variação de estoque (entrada, saída, ajuste...) |
| Livro de estoque | Conjunto de movimentos; fonte da verdade do saldo |
| Idempotência | Repetir a mesma operação não produz efeito duplicado |
| Snapshot | Cópia de dados (preço, nome, custo, dados fiscais) gravada na venda no momento da finalização |
| NFC-e | Nota Fiscal de Consumidor Eletrônica (modelo 65), para venda de mercadorias ao consumidor; emitida via SEFAZ estadual |
| NFS-e Nacional | Nota Fiscal de Serviço eletrônica no Padrão Nacional, para serviços |
| CSC | Código de Segurança do Contribuinte; segredo da NFC-e gerado no portal da SEFAZ |
| Certificado A1 | Certificado digital da empresa em arquivo (.pfx), exigido pelos provedores de emissão |
| NCM / CFOP / CSOSN | Classificação da mercadoria / código fiscal da operação / código de situação tributária do Simples Nacional |
| IBS / CBS | Novos tributos da reforma tributária; campos informativos nas notas do Simples a partir de 2027 |
| PWA | Aplicação web instalável com cara de app |
| MVP | Fase 1: versão mínima que o cliente usa no dia a dia |
