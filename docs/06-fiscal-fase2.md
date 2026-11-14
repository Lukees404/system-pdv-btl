# 06 — Fiscal (Fase 2) e preparação na Fase 1

> **Aviso.** Regras fiscais mudam e variam por estado, município e regime. O levantamento abaixo foi feito em **14/11/2026** em fontes públicas (listadas no fim) e **deve ser confirmado pelo contador** antes de qualquer decisão. Nada aqui substitui orientação contábil.

## 1. Escopo

| Documento | Para quê | Autoridade | Quando |
|---|---|---|---|
| **NFC-e** (modelo 65) | Venda de **produtos** ao consumidor final | SEFAZ-AM | Fase 2 |
| **NFS-e Padrão Nacional** | **Serviços** (consulta, vacinação, exames, atendimento domiciliar etc.) | Emissor Nacional / Prefeitura de Manaus | Fase 2 |

Uma venda **mista** (produtos + serviços) gera **dois** documentos independentes (ADR-013).

## 2. O que foi levantado

**NFC-e no Amazonas**
- A cartilha da SEFAZ-AM indica que a NFC-e é obrigatória para os contribuintes do varejo, **inclusive optantes pelo Simples Nacional**, e que o contribuinte obtém o **CSC** no portal da SEFAZ e o informa no emissor. A mesma cartilha afirma que não há credenciamento de equipamentos. *(Documento antigo — confirmar vigência com o contador.)*
- A Resolução GSEFAZ nº 25/2024 trata do **Nota Fiscal Fácil (NFF)**, aplicativo da SEFAZ-AM para ME/EPP do Simples com inscrição estadual ativa emitirem NFC-e; contribuintes com CNAE de comércio varejista foram credenciados de ofício. É uma **alternativa gratuita de curto prazo** enquanto o PDV não emite (decisão do cliente com o contador, `OQ-26`).
- Impressão do DANFE NFC-e é facultativa; o XML é o documento com valor fiscal; pode ser enviado ao cliente por e-mail/QR Code.
- Contingência offline: a NFC-e emitida em contingência deve ser transmitida até o fim do **primeiro dia útil seguinte** (conforme documentação de provedor). Só NFC-e **autorizada** pode ser cancelada, por evento, com prazo definido pela legislação estadual (confirmar).

**NFS-e em Manaus**
- A Prefeitura de Manaus oficializou a adoção obrigatória da **NFS-e Padrão Nacional** a partir de **01/01/2026** (Portaria nº 3 SUBREC/SEMEF, de 10/04/2026), substituindo o sistema local "Nota Manaus" para novos fatos geradores, **inclusive para optantes do Simples**. Não há credenciamento prévio; acesso ao emissor por usuário e senha, certificado digital ou conta gov.br. O ISSQN continua recolhido por guia gerada no sistema local (até o dia 10 do mês seguinte), e optantes do Simples recolhem pelo DAS.
- A obrigatoriedade nacional para ME/EPP do Simples foi fixada pelo Comitê Gestor do Simples Nacional; **as fontes divergem quanto à data** (Res. CGSN nº 189/2026 → 01/09/2026; uma fonte posterior cita a Res. CGSN nº 191/2026 → 01/11/2026). Em qualquer das hipóteses, na data deste documento a obrigação **já vale** para a empresa. Confirmar (`OQ-04`).
- O Emissor Nacional oferece interface web e **API** para integração.

**Reforma tributária (IBS/CBS)**
- Para optantes do Simples (CRT 1/2) e MEI, o preenchimento dos campos de **IBS/CBS** na NF-e/NFC-e é previsto a partir do **início de 2027** (fontes citam 01/01/2027 e 04/01/2027). Em 2026, os campos são informativos e sem cobrança. Os provedores acompanham o leiaute; o sistema precisa estar pronto para carregar os dados adicionais quando o contador/provedor definirem (CST e classificação tributária). Confirmar no leiaute vigente.

**Provedores de emissão (candidatos, a validar na M11)**
- **Focus NFe:** API REST para NFC-e, NF-e e NFS-e (inclusive Ambiente Nacional); aceita **somente certificado A1** (a empresa tem A1); tem ambiente de testes; página de preços listava um plano de NFC-e para 1 CNPJ na casa de **R$ 60/mês** (valor a confirmar e verificar se cobre NFS-e).
- **NFE.io:** emissão assíncrona com resposta imediata e resultado por **webhook**, certificado A1, homologação, contingência para NFC-e.
- **Outros** (a avaliar): demais APIs de emissão e ERPs com API pública.

## 3. Pré-requisitos e situação atual

| Item | Situação | Responsável |
|---|---|---|
| Inscrição estadual ativa | **Sim** | — |
| Certificado digital e-CNPJ **A1** | **Sim**, vence em ≈ nov/2027 (confirmar data; criar lembrete de renovação) | Contador/clientes |
| Regime | Simples Nacional | — |
| Credenciamento/obrigatoriedade NFC-e (SEFAZ-AM) | **Não** informado como feito (`OQ-03`) | Contador |
| **CSC** de produção/homologação | **Não existe** (`OQ-03`) | Contador |
| Cadastro/uso do Emissor Nacional NFS-e | **Não** (`OQ-04`) | Contador |
| Código de tributação e alíquota ISS dos serviços | **Desconhecido** (`OQ-04`) | Contador |
| Tabela fiscal dos produtos (NCM, CFOP, CSOSN, origem) | **Desconhecida** (`OQ-02`) | Contador |
| Provedor de emissão e orçamento | **A escolher** (`OQ-21`) | Pedro + clientes |

## 4. O que a Fase 1 já entrega (preparação)

Somente dados e estrutura, **sem código de emissão** (não criar a porta nem adaptadores antes da M11 — evita código especulativo):

- Campos fiscais opcionais em `products` e `services` com validação de formato (RN-FIS-02).
- `sale_items.fiscal_snapshot` e `sale_items.net_total_cents` / `discount_share_cents` (o desconto já vem rateado por item, requisito das notas).
- `sales.customer_cpf` e `sales.fiscal_status = NOT_ISSUED`.
- Marcador de tipo de item (`PRODUCT`/`SERVICE`) para separar NFC-e e NFS-e.
- Importação aceita colunas fiscais opcionais (NCM etc.) `[S]`.

## 5. Arquitetura da Fase 2 (M11)

**Porta** (`modules/fiscal/application/ports.ts`), contrato conceitual:

```ts
interface FiscalGateway {
  issueConsumerInvoice(input: ConsumerInvoiceInput): Promise<IssueResult>; // NFC-e
  issueServiceInvoice(input: ServiceInvoiceInput): Promise<IssueResult>;   // NFS-e Nacional
  cancel(ref: ProviderRef, reason: string): Promise<CancelResult>;
  getStatus(ref: ProviderRef): Promise<DocumentStatus>;
}
```

- **Adaptadores:** um por provedor (`infrastructure/focus-nfe`, ...) + `FakeFiscalGateway` para testes.
- **Fluxo assíncrono:** `completeSale` grava `fiscal_documents` em `PENDING` e um evento de **outbox** na mesma transação → *worker* (rota agendada) emite → provedor responde por **webhook** (assinatura verificada) ou por consulta → atualiza `fiscal_documents` e `sales.fiscal_status`.
- **Idempotência com o provedor:** referência única por documento (ex.: `saleId:kind`), para reenviar sem duplicar nota.
- **Falhas:** `REJECTED` guarda código/mensagem; **retentativas com *backoff*** para falhas transitórias; rejeição por dado inválido exige correção e **reemissão manual**; alerta visível no Início e no detalhe da venda. **A venda nunca fica presa** (RN-FIS-05).
- **Venda mista:** separar itens por tipo; cada documento usa os `net_total` dos seus itens. A **alocação dos pagamentos** entre as duas notas precisa de regra determinística (proposta: proporcional ao total de cada documento, com maior resto) — `OQ-22`.
- **CPF na nota** (opcional) e envio do XML/DANFE por e-mail ou compartilhamento ao cliente.
- **Cancelamento/devolução com nota autorizada:** fluxo e prazos definidos com o contador (`OQ-23`); até lá, bloquear a devolução automática de venda com nota autorizada e orientar ao procedimento manual.
- **Interface:** selo de status fiscal na venda (`PENDING`/`AUTHORIZED`/`REJECTED`), botão "reenviar", download do XML/PDF, lista de pendências.
- **Relatório para o contador:** exportação mensal dos XMLs/relatório de notas (formato a combinar — `OQ-21/OQ-23`).

## 6. Segurança e segredos (RN-FIS-06)

- O **.pfx (A1) e sua senha** são enviados ao provedor (conforme o fluxo dele) e **nunca** entram no repositório, nos logs ou no banco da aplicação em texto puro.
- Chaves de API, **CSC** e *tokens* de webhook ficam em variáveis de ambiente do provedor de hospedagem, rotacionáveis.
- Webhooks: validar assinatura/segredo, rejeitar replay, responder rápido e processar de forma idempotente.
- Logs fiscais **sem dados pessoais** além do estritamente necessário.

## 7. Testes da Fase 2

- Testes unitários de **mapeamento** venda → payload (itens, descontos rateados, CPF, formas de pagamento) com *fixtures*.
- `FakeFiscalGateway` programável (sucesso, rejeição, timeout, resposta duplicada) para testar o fluxo assíncrono, *retries*, idempotência e a regra "venda nunca fica presa".
- Testes de contrato do adaptador contra o **ambiente de homologação** do provedor, **fora do CI padrão** (execução manual/agendada, com certificado de teste).
- Nenhuma chamada real a provedor ou SEFAZ em testes automatizados.

## 8. Fontes consultadas (14/11/2026)

- Cartilha NFC-e SEFAZ-AM — portalnfce.sefaz.am.gov.br
- Resolução GSEFAZ nº 25/2024 (Nota Fiscal Fácil) — legisweb.com.br
- Portaria nº 3 SUBREC/SEMEF, NFS-e Padrão Nacional em Manaus — coad.com.br; notagateway.com.br; nota.manaus.am.gov.br
- Resolução CGSN nº 189/2026 e nº 191/2026 (NFS-e Simples) — IOB; contmatic; contaazul.com
- Reforma tributária e NF-e/NFC-e (IBS/CBS, Simples em 2027) — Bling (ajuda); guiatributario.net; contabeis.com.br
- Focus NFe (preços, certificado A1, NFC-e, NFS-e Nacional) — focusnfe.com.br
- NFE.io (processamento, contingência, homologação) — nfe.io
