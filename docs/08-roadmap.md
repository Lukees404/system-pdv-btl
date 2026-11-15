# 08 — Roadmap e Marcos

Marcos pequenos, cada um **testável e utilizável**. Tamanho: `S` pequeno, `M` médio, `L` grande (relativo, sem prazos). **Todo marco segue TDD** (`07`) e termina com a Definition of Done do documento 07.

## Progresso

| Marco | Nome | Tam. | Status |
|---|---|---|---|
| M0 | Fundação | M | ☑ concluído em 15/11/2026 (ver "Execução do M0") |
| M1 | Autenticação e auditoria | M | ◐ em andamento (iniciado em 15/11/2026) |
| M2 | Catálogo (categorias, produtos, serviços) | M | ☐ |
| M3 | Estoque (livro de movimentos) | M | ☐ |
| M4 | Importação de planilha | M | ☐ |
| M5 | Clientes e pets | S | ☐ |
| M6 | Caixa | M | ☐ |
| M7 | Venda | L | ☐ |
| M8 | Devolução | S | ☐ |
| M9 | Relatórios | M | ☐ |
| M10 | Endurecimento e entrada em produção | M | ☐ |
| M11 | Fiscal (Fase 2) | L | ☐ |

Ordem e dependências: `M0 → M1 → M2 → M3 → M4`; `M1 → M5`; `M1 → M6`; `M2 + M3 + M5 + M6 → M7 → M8`; `M7/M8 → M9`; `M0…M9 → M10`; `M10 + pré-requisitos fiscais → M11`.
*Atualize esta tabela ao concluir cada marco (o `check-traceability` usa os marcos concluídos).*

---

## M0 — Fundação
**Objetivo:** esqueleto pronto para TDD, com pipeline verde.
**Escopo:** repositório e Next.js (App Router) + TypeScript estrito; lint/format; Prisma + Postgres via Docker Compose; Vitest (unitário e integração com banco real), Playwright (esqueleto), `fast-check`; CI conforme `07 §8`; `dependency-cruiser` com as regras de `04`; `shared/` (`Money`, `Clock`, `IdGenerator`, `Result`, erros de domínio, catálogo i18n); `lib/env` validado; logger estruturado; `/api/health`; `.env.example`; `scripts/check-traceability.ts` (informativo); `CLAUDE.md` e `docs/` na raiz; deploy de pré-visualização.
**Regras/RNF:** RN-DIN-01…05, RNF-MAN-01…05, RNF-OPS-01…03, RNF-OBS-01/03.
**Testes primeiro:** `Money` completo (soma, half-up, rateio por maior resto, formatação, propriedades com `fast-check`); `Clock`/`Result`; teste de integração "migrações aplicam do zero"; teste que **falha** quando uma fronteira de módulo é violada.
**Saída:** CI verde; deploy de preview respondendo `/api/health` com banco.

**Execução do M0 (14/11/2026):**
- **Feito e verificado:** tudo do escopo, exceto o que está em "Pendentes". Em clone limpo com Postgres novo, a sequência do CI passa (unitários, integração, build, E2E, auditoria).
- **CI no GitHub (15/11/2026):** repositório criado e `main` publicada; o workflow rodou e ficou **verde** no commit `42aaade` (verify, windows-unit, audit, secrets e e2e). A primeira execução falhou no `format:check` porque o `README.md` criado pelo GitHub não terminava com quebra de linha; corrigido.
- **Deploy (15/11/2026):** Supabase (`sa-east-1`, Postgres 17) migrado e Vercel (`system-pdv-btl`) no ar; `GET /api/health` respondeu **200 `{"status":"ok","db":"up"}`** no deploy de produção (branch `main`) e o CI está verde no commit `233ea28`. A conferência foi feita no deploy de produção; o ambiente *Preview* usa a mesma configuração, mas não foi testado separadamente.
- **Ajustes pendentes (não bloqueiam o marco):** definir a região das funções da Vercel como São Paulo (`gru1`; hoje `iad1`) e decidir no M2 o schema das extensões (aviso do advisor do Supabase). Ver `docs/runbooks/deploy-preview.md`.
- **Desvios do escopo original:** as extensões `unaccent`/`pg_trgm` foram criadas já na migração-base do M0 (o M2 apenas as usa); `RN-DIN-04` (total > 0) não tem teste no M0, porque é regra da venda e entra no M7; Prisma fixado em 7.10.1 (a tag `latest` do CLI aponta para um RC); `DIRECT_URL` é opcional no servidor.
- **Cobertura de regras no fim do M0:** `check:traceability` mostra 4 de 154 (`RN-DIN-01`, `02`, `03`, `05`).

## M1 — Autenticação e auditoria
**Escopo:** RF-AUT-01…04; módulo `audit`; tabela `users`; sessões; limitação de tentativas; script `create-user`; casca da aplicação (layout, navegação mobile/desktop); ADR-011 decidido: implementação própria (ver `04`); parâmetros de segurança em `OQ-28`. **Antes de migrar a produção:** desligar a Data API do Supabase (`docs/runbooks/deploy-preview.md` §6).
**Regras:** RN-ACE-01…06, RNF-SEG-01…05/07.
**Testes primeiro:** login válido/inválido, bloqueio após 5 falhas, troca de senha invalida sessões, rotas protegidas retornam 401/403, `audit_log` sem `UPDATE/DELETE`, nenhum dado pessoal em auditoria.
**Saída:** é possível entrar, sair e trocar a senha; ações auditadas.

## M2 — Catálogo
**Escopo:** RF-CAT-01…04, 06, 07 (foto = `S`, pode ir ao M10); extensões `unaccent`/`pg_trgm` (já criadas na migração-base do M0; aqui entram os índices e a busca); busca rápida; campos fiscais opcionais com validação; arquivar/reativar; auditoria de alteração de preço/custo; seed de serviços e taxa de deslocamento.
**Regras:** RN-CAT-01…07, RN-SER-01…03/05/07, RN-FIS-02.
**Testes primeiro:** unicidade (nome, código de barras, taxa única), busca sem acento/parcial com 5.000 produtos (limiar RNF-DES-01), arquivados fora da busca de venda, validação de NCM/CFOP/CSOSN.
**Saída:** catálogo completo e utilizável.

## M3 — Estoque
**Escopo:** RF-EST-01…05 (06 = `C`); módulo `inventory` com API pública `applyMovement`/`decrementForSale` (UPDATE condicional atômico, ADR-008); `balance_after`; histórico; alerta de estoque baixo; `scripts/check-stock-consistency.ts`.
**Regras:** RN-EST-01…11.
**Testes primeiro:** movimentos imutáveis; `stock_qty = Σ movimentos` após operações aleatórias; ajuste/perda exigem motivo; **concorrência** (duas baixas disputando o último item); saldo nunca negativo.
**Saída:** estoque auditável e consistente.

## M4 — Importação de planilha
**Escopo:** RF-IMP-01…04; parser CSV/XLSX; mapeamento de colunas; prévia sem gravar; confirmação transacional; lote com hash; exportação de erros; criação de categorias; estoque inicial via `INITIAL`.
**Regras:** RN-IMP-01…08. **Dependência:** `OQ-01` (colunas reais); sem resposta, usar mapeamento manual.
**Testes primeiro:** *fixtures* da `07 §6` (BOM, separadores, preços pt-BR, duplicatas, 5.000 linhas, XLSX); prévia não grava; estoque de existente não sobrescrito; reimportação detectada.
**Saída:** a planilha atual do cliente é importada com relatório de erros.

## M5 — Clientes e pets
**Escopo:** RF-CLI-01…05 (04 = `S`); validação de CPF/telefone; aviso de duplicata; anonimização.
**Regras:** RN-CLI-01…06, RNF-LGPD-01…05.
**Testes primeiro:** CPF/telefone; duplicatas; anonimização preserva vendas (quando existirem) e remove dados pessoais; auditoria sem PII.

## M6 — Caixa
**Escopo:** RF-CAI-01…05; `cash_sessions`, `cash_movements`; índice único de sessão aberta; suprimento/sangria; fechamento com `FOR UPDATE`; esperado = abertura + movimentos da gaveta.
**Regras:** RN-CAI-01…10.
**Testes primeiro:** abertura concorrente (só uma vence); sangria acima do esperado; diferença exige observação; `SALE_CASH_HOME` fora da gaveta; sessão fechada imutável; bloqueio com vendas em espera (stub até o M7).
**Saída:** caixa opera isolado e confere esperado × contado.

## M7 — Venda
**Escopo:** RF-VEN-01…10 (08 = `S`); caso de uso `completeSale` conforme `04 — Fluxo crítico`; carrinho (estado local), desconto com rateio, cliente/pet, canal e endereço, pagamento misto e troco, venda em espera, consulta de vendas, comprovante não fiscal; integração com `inventory`, `cash-register` e `customers` via APIs públicas; E2E do fluxo principal em celular.
**Regras:** RN-VEN-01…15, RN-PAG-01…07, RN-EST-02/08/09, RN-CAI-03, RN-SER-02/04/06, RN-FIS-01/03/04.
**Testes primeiro:** todos os cenários de venda da `07 §6` (idempotência, concorrência na última unidade, *rollback*, snapshot, imutabilidade).
**Saída:** vender de ponta a ponta. **A partir daqui `check-traceability` falha o CI** para o escopo concluído.

## M8 — Devolução
**Escopo:** RF-DEV-01; cálculo proporcional com resíduo; `RETURN_IN`/`LOSS`; `REFUND_CASH`; bloqueio de devolução automática para venda com nota autorizada (Fase 2).
**Regras:** RN-DEV-01…08.
**Testes primeiro:** soma de reembolsos parciais = `net_total`; limites por item; `CASH` sem caixa aberto recusado; serviço sem estoque.

## M9 — Relatórios
**Escopo:** RF-REL-01…06; consultas SQL agregadas; fuso `America/Manaus`; exportação CSV; índices.
**Regras:** RN-REL-01…06. **Testes primeiro:** virada de dia em Manaus vs UTC, receita líquida com devolução, margem ignorando itens sem custo, desempenho com 1 ano de dados (RNF-DES-05).

## M10 — Endurecimento e entrada em produção
**Escopo:** PWA (RF-SIS-02/03, banner offline, carrinho local preservado); foto de produto; revisão de segurança (`backend-design:security-reviewer` e checklist ASVS L1); varredura de a11y; testes de desempenho; **backup + exportação + teste de restauração + runbook** (`docs/runbooks/`); observabilidade e alertas; revisão LGPD; **migração real de dados** (planilha do cliente); **UAT com os usuários** em celular e desktop; treinamento curto; checklist de *go-live*; plano de *rollback*.
**Saída:** sistema em produção usado no dia a dia, com backup testado.

## M11 — Fiscal (Fase 2)
**Pré-requisitos (bloqueiam o início):** `OQ-02`, `OQ-03`, `OQ-04`, `OQ-21` respondidos; CSC gerado; cadastro no Emissor Nacional; tabela fiscal preenchida; provedor contratado com ambiente de testes.
**Escopo:** conforme `06 §5` — porta `FiscalGateway`, `FakeFiscalGateway`, adaptador do provedor, `outbox` e *worker*, `fiscal_documents`, NFC-e e NFS-e, venda mista, UI de status/reenvio/download, relatório para o contador, preparação para IBS/CBS (2027), lembrete de renovação do certificado A1.
**Testes primeiro:** `06 §7`.

---

## Riscos principais

| Risco | Mitigação |
|---|---|
| Bug de concorrência em estoque/caixa | ADR-008; testes de concorrência no M3/M6/M7; invariantes no banco |
| Qualidade dos dados da planilha | Prévia + relatório de erros; UAT com dados reais no M10 |
| Pré-requisitos fiscais demoram | Tratar com o contador **agora**, em paralelo; considerar NFF como ponte (`OQ-26`) |
| Mudança de regra fiscal (NFS-e, IBS/CBS) | Provedor de emissão + porta; revisar `06` a cada trimestre |
| Escopo crescendo (prontuário, agenda...) | Não-objetivos em `00 §5`; novas ideias viram `OQ`/backlog |
| Dependência de uma única pessoa | Documentação, runbooks, testes e ADRs |
| Certificado A1 vence (≈ nov/2027) | Lembrete com 60 dias de antecedência |

## Prompt sugerido para o `/plan` de cada marco

```
Leia CLAUDE.md e docs/ (começando por docs/README.md). Planeje o marco [Mx] de
docs/08-roadmap.md em etapas pequenas, em TDD: para cada etapa liste os testes
que serão escritos primeiro (citando os IDs RN/RF), os arquivos a criar/alterar
e os riscos. Não implemente ainda. Se algo estiver ambíguo, consulte
docs/09-perguntas-em-aberto.md; se a suposição padrão não resolver, pergunte.
```
