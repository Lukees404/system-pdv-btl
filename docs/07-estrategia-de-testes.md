# 07 — Estratégia de Testes (TDD)

## 1. Princípios

1. **Toda regra de negócio tem teste**, e o teste cita o ID da regra no título (`[RN-PAG-03]`). A meta é **cobertura de regras**, não percentual de linhas.
2. **TDD nas regras:** primeiro o teste que falha, depois o código mínimo, depois refatoração (ver seção 2).
3. **Testar comportamento, não implementação.** Se refatorar sem mudar comportamento quebra testes, o teste está errado.
4. **Banco real nos testes de transação.** Os bugs perigosos (concorrência, idempotência, constraints) só aparecem com Postgres de verdade; **proibido mock de banco** nesses testes.
5. **Determinismo:** relógio, IDs e aleatoriedade injetados; sem rede; sem `sleep`; sem dependência de ordem.
6. **Pirâmide:** muitos testes unitários de domínio, uma boa camada de integração, poucos E2E.

## 2. Ciclo TDD (obrigatório para regras e casos de uso)

1. **Ler** as regras (`RN-*`) e critérios (`RF-*`) do item.
2. **Red:** escrever o teste (citando IDs) e **rodá-lo vendo falhar pelo motivo certo**.
3. **Green:** implementar o mínimo para passar.
4. **Refactor:** limpar com testes verdes; rodar a suíte relevante.
5. **Commit pequeno.** Padrão de commits (Conventional Commits): `test(sales): [RN-PAG-03] cobre troco com pagamento misto` seguido de `feat(sales): calcula troco...`. Commits de `test:` e `feat:` podem ser separados ou combinados, mas o teste **precisa ter sido visto falhando**.
6. **Bug encontrado?** Escrever o teste que reproduz o bug **antes** da correção.

Onde TDD estrito **não** se aplica: estilo visual, layout, textos e código de cola trivial. Nesses casos, teste junto com o código (componentes críticos) ou cubra por E2E.

## 3. Camadas e ferramentas

| Camada | O que cobre | Ferramenta | Abordagem |
|---|---|---|---|
| **Unitário de domínio** | `Money`, descontos, rateio, troco, validação de CPF/telefone/NCM, parsing de planilha, regras de caixa/estoque/devolução | Vitest | **TDD estrito**; rápido, sem I/O |
| **Propriedades** | Invariantes de dinheiro (soma das partes = total, nunca negativo, half-up) | Vitest + `fast-check` | Junto do unitário |
| **Integração (banco real)** | Repositórios, transações, constraints, idempotência, concorrência, imutabilidade, migrações | Vitest + Postgres de teste | **TDD**; sem mock de banco |
| **Casos de uso / actions** | Fluxos completos sobre banco real, incluindo autorização (401/403) | Vitest | TDD |
| **Componentes** | Carrinho, pagamento/troco, formulários críticos, estados de erro | Testing Library | Junto do código |
| **E2E** | Login → abrir caixa → vender → devolver → fechar caixa; importação; venda em espera | Playwright (celular e desktop) | Poucos, depois que o módulo existe |
| **Acessibilidade** | Fluxos principais sem violações | `axe` dentro do E2E | Automático |
| **Desempenho (fumaça)** | Busca p95 com 5.000 produtos; finalizar venda com 20 itens | Script de teste com dados semeados | Limiares de RNF-DES |
| **Segurança** | Rotas sem sessão, IDOR, validação de entrada, cabeçalhos | Integração + E2E | Checklist em PR |

## 4. Banco de teste

- Postgres local via Docker (`docker compose`) e *service container* no CI; **migrações aplicadas uma vez** por execução (`prisma migrate deploy`).
- Isolamento: cada arquivo de teste de integração roda sobre **esquema isolado** ou limpa as tabelas entre testes (`TRUNCATE … RESTART IDENTITY CASCADE`), sem dependência de ordem. *Implementado no M0:* um **banco isolado por arquivo** (`createIsolatedDatabase` em `tests/helpers/db.ts`, criado e apagado pelo próprio teste) e `truncateAll` para limpar entre testes quando o banco for compartilhado dentro do arquivo.
- Factories em `tests/helpers` criam estados válidos mínimos (`aProduct()`, `anOpenCashSession()`, `aCompletedSale()`), com *overrides* explícitos.
- O usuário do banco usado pela aplicação nos testes tem **os mesmos privilégios mínimos** da produção (valida RNF-SEG-07).
- A extensão `pg_trgm` (schema `ext`; o `unaccent` foi removido no M2) e os índices parciais vêm das migrações — o teste de integração garante que existem e que o índice trigram é usado na busca.

## 5. Convenções

- **Local:** `*.test.ts` ao lado do código (unitário); `*.int.test.ts` (integração); `tests/e2e/*.spec.ts` (E2E); planilhas de exemplo em `tests/fixtures/`.
- **Títulos:** `describe('completeSale')` → `it('[RN-VEN-09] repete a mesma idempotencyKey e devolve a mesma venda')`. Um comportamento por teste; estrutura *Arrange / Act / Assert*.
- **Relógio e IDs:** `FakeClock` e `FakeIdGenerator`; testar virada de dia em `America/Manaus` e a diferença para UTC.
- **Sem lógica nos testes** (sem laços/condicionais que reimplementem o código); dados explícitos e legíveis.
- **Mensagens de erro:** testar o **código de erro** (`INSUFFICIENT_STOCK`), não o texto; textos pt-BR têm teste próprio no catálogo.
- **Anti-padrões proibidos:** mock de banco em testes de transação, `sleep`, *snapshots* gigantes, testar detalhes privados, testes que dependem de rede, ordem ou da data atual.

## 6. Cenários obrigatórios por tema

**Dinheiro (RN-DIN)** — half-up (`1.999 × 10% = 200`), rateio por maior resto soma exata, propriedade `Σ partes = total`, limites de inteiro seguro.

**Venda (RN-VEN / RN-PAG)** — pagamento único e misto, troco só em dinheiro, pagamento insuficiente/excedente, desconto inválido, total zero, caixa fechado, estoque insuficiente com lista de itens, **idempotência** (mesma chave), **concorrência** (duas finalizações disputando a última unidade com `Promise.all`: exatamente uma sucede), *rollback* total em falha no meio, venda concluída imutável, snapshot preservando preço/custo/fiscal após alteração do produto.

**Estoque (RN-EST)** — movimentos imutáveis, `balance_after`, `stock_qty = Σ movimentos` após sequência aleatória de operações, ajuste/perda exigem motivo, devolução reabastece ou gera perda.

**Caixa (RN-CAI)** — única sessão aberta mesmo com aberturas concorrentes, sangria acima do esperado recusada, esperado × contado × diferença, `SALE_CASH_HOME` fora da gaveta, fechamento bloqueado com venda em espera, venda concorrente ao fechamento (uma das duas vence de forma consistente), sessão fechada imutável.

**Devolução (RN-DEV)** — parcial/total, resíduo na última unidade, limite por item, reembolso `CASH` sem caixa aberto, serviço sem estoque.

**Importação (RN-IMP)** — *fixtures*: CSV UTF-8 com e sem BOM, separadores `;` e `,`, preços `12,50` / `R$ 12,50` / `1.234,56`, linhas vazias, duplicatas no arquivo e no banco, código de barras repetido, estoque inválido, 5.000 linhas, XLSX; prévia **não grava**; reimportação do mesmo hash; estoque de existente **não** sobrescrito.

**Clientes (RN-CLI)** — CPF válido/inválido, telefone normalizado, duplicata, anonimização preservando vendas e removendo dados pessoais (inclusive do `audit_log`).

**Auth/Segurança (RN-ACE / RNF-SEG)** — rotas protegidas sem sessão, bloqueio após falhas, troca de senha invalida sessões, `audit_log` sem `UPDATE`/`DELETE`, nenhum dado pessoal em logs.

**Relatórios (RN-REL)** — fronteira de dia em `America/Manaus`, receita líquida com devolução, margem ignorando itens sem custo.

**Migrações** — aplicar do zero + *seed*; verificar `CHECK`s, índices parciais e extensões.

## 7. Rastreabilidade

- Script `scripts/check-traceability.ts` lê `docs/01-regras-de-negocio.md` e `docs/02-requisitos-funcionais.md`, extrai os IDs `RN-*`/`RF-*` e verifica se cada um aparece em ao menos um título de teste.
- **Marco M0:** o script existe e roda em modo informativo. **A partir do M7:** passa a **falhar o CI** para regras do escopo já implementado (lista de marcos concluídos em `docs/08-roadmap.md`).

## 8. Portões de qualidade (CI)

Em todo PR, nesta ordem: instalar → `lint` → `typecheck` → `check:boundaries` → testes unitários → migrações no banco de teste → testes de integração → `check:traceability` → build. E2E em **todo PR** (a suíte é curta, ~1 min, e só o PR verde pode ser mesclado) e de novo na branch principal antes do deploy; se a suíte crescer a ponto de atrasar o fluxo, restringir aos PRs que tocam telas críticas. Piso de cobertura **somente no domínio** (≥ 90% de ramos, como alarme, não como meta); sem piso para telas.

## 9. Definition of Done (por tarefa)

- [ ] Regras/critérios lidos e citados nos testes.
- [ ] Testes escritos **antes** e vistos falhando.
- [ ] Todos os testes passam localmente e no CI; sem testes ignorados (`skip`) sem issue.
- [ ] Lint, typecheck e fronteiras de módulos limpos.
- [ ] Sem regra de negócio fora do domínio/casos de uso.
- [ ] Mensagens de erro em pt-BR no catálogo; sem texto solto em componentes.
- [ ] Auditoria registrada onde exigido (RN-ACE-02); sem dado pessoal em log/auditoria.
- [ ] Migração revisada (se houver) e compatível sem downtime.
- [ ] Documentação atualizada (regra, requisito, ADR, `09`) **no mesmo PR** quando algo mudou.
- [ ] Mudança verificada manualmente em celular e desktop quando afeta tela.

## 10. Opcional (quando o domínio estabilizar)

Teste de mutação (ex.: Stryker) nos módulos `domain/` de dinheiro, estoque e caixa para detectar testes fracos.
