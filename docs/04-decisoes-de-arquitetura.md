# 04 — Decisões de Arquitetura

Formato: **Status · Contexto · Decisão · Consequências · Alternativas descartadas**. Mudar uma decisão exige novo ADR (ou revisão deste documento) **antes** de mudar o código.

## Registro de decisões

### ADR-001 — Monólito modular em Next.js
**Status:** aceito. **Contexto:** um desenvolvedor, carga pequena, projeto que virará base para outros clientes. **Decisão:** uma aplicação Next.js (App Router) organizada em **módulos de domínio** com fronteiras verificadas por ferramenta (RNF-MAN-02). **Consequências:** deploy e manutenção simples; extração futura de módulos é possível. **Descartadas:** microsserviços (complexidade sem ganho), monorepo multi-pacote (prematuro).

### ADR-002 — TypeScript em modo estrito
**Decisão:** `strict: true`, `noUncheckedIndexedAccess`, sem `any` implícito. Tipos de domínio compartilhados entre servidor e telas. **Consequências:** erros de dinheiro/estoque aparecem em compilação.

### ADR-003 — PostgreSQL
**Contexto:** 4 aparelhos vendendo ao mesmo tempo exigem transações e concorrência reais. **Decisão:** PostgreSQL. **Descartadas:** SQLite (concorrência de escrita e acesso remoto limitados para este uso).

### ADR-004 — Prisma como ORM e gerenciador de migrações
**Decisão:** Prisma para modelo, migrações e consultas comuns; **SQL bruto parametrizado** onde necessário (UPDATE condicional de estoque, busca com `pg_trgm`, relatórios). **Consequências:** `CHECK`, índices parciais e extensões entram em migrações SQL escritas à mão. **Alternativas:** Drizzle (válida; sem ganho decisivo aqui). **Implementação (M0):** Prisma 7.10.1 fixo; a URL das migrações fica em `prisma.config.ts` (`DIRECT_URL`) e a aplicação usa `DATABASE_URL` pelo adapter `pg` (`src/lib/db.ts`); o client gerado fica em `src/generated/` (fora do Git).

### ADR-005 — Supabase só como Postgres + armazenamento via porta; Vercel na hospedagem
**Decisão:** usar Supabase como **Postgres gerenciado** (conexão via *pooler* em ambiente serverless) e como armazenamento S3-compatível **atrás da porta `FileStorage`**. Nada de recursos exclusivos (Auth, RLS, Realtime, Edge Functions) no domínio. Aplicação na Vercel. **Consequências:** trocar de provedor de banco/arquivos é uma mudança de adaptador (RNF-POR-01/03). **Atenção:** conexões em serverless → usar o pooler e limitar o pool. **Implementação (M0):** dois papéis de banco, `pdv_owner` (dono do schema, roda migrações) e `pdv_app` (aplicação, só DML, RNF-SEG-07); a credencial do dono nunca entra no ambiente do servidor. Migrações pelo Supavisor em modo *session* e a aplicação em modo *transaction* (a conexão direta do Supabase é só IPv6); detalhes em `docs/runbooks/deploy-preview.md`.

### ADR-006 — Dinheiro em centavos (inteiro)
**Decisão:** `number` inteiro seguro (`Number.isSafeInteger`) em centavos, encapsulado em utilitário `Money` em `shared/` (soma, subtração, `percentOf` com half-up, rateio por maior resto, formatação `R$`). `CHECK` no banco. **Descartadas:** `float` (erro de arredondamento), `Decimal` (desnecessário para BRL).

### ADR-007 — Livro de estoque + saldo em cache
**Decisão:** `stock_movements` é a fonte da verdade; `products.stock_qty` é cache atualizado **na mesma transação**; somente o módulo `inventory` escreve `stock_qty` (acoplamento deliberado e documentado). Verificação de consistência automatizada (RNF-INT-04). **Consequências:** auditável; leitura rápida; dupla escrita controlada por transação.

### ADR-008 — Finalização transacional, idempotente, com baixa condicional atômica
**Decisão:** ver algoritmo na seção "Fluxo crítico: finalizar venda". Pontos-chave: `UPDATE products SET stock_qty = stock_qty - :q WHERE id = :id AND stock_qty >= :q` (0 linhas = estoque insuficiente); itens processados em **ordem determinística de ID** (evita deadlock); chave de idempotência única; sessão de caixa travada com `FOR SHARE` na venda e `FOR UPDATE` no fechamento. **Descartadas:** lock otimista com versão (mais tentativas sob disputa), `SERIALIZABLE` global (retentativas desnecessárias).

### ADR-009 — Vendas imutáveis; devolução como novo registro
**Decisão:** venda concluída não é editada; devolução é entidade própria (`returns`). **Consequências:** histórico fiel; encaixa no modelo fiscal.

### ADR-010 — PWA somente online
**Decisão:** o service worker faz cache de **recursos estáticos** apenas; mutações exigem conexão. O carrinho local é preservado, mas finalização offline é bloqueada. **Consequências:** sem fila de sincronização nem resolução de conflitos. **Revisão:** reavaliar se a conectividade se mostrar um problema real.

### ADR-011 — Autenticação por credenciais com sessão em cookie
**Status:** aceito (M1, 15/11/2026). **Critérios:** e-mail+senha, hash argon2id/bcrypt, cookie `HttpOnly`/`Secure`, sessões revogáveis no servidor, bloqueio por tentativas, sem dependência de serviço externo obrigatório, fácil de trocar (porta `AuthService`). **Decisão:** **implementação mínima própria** sobre sessões em tabela do banco (`sessions`): token aleatório de 32 bytes (no banco fica só o SHA-256), hash de senha argon2id (`@node-rs/argon2`), cookie `HttpOnly`/`SameSite=Lax`/`Secure` em produção. A checagem de sessão fica numa camada de acesso (`verifySession()`, ADR-019) chamada em cada página, ação e rota; o `proxy.ts` do Next só faz redirecionamento otimista pelo cookie, sem consultar o banco. **Consequências:** nenhum segredo de assinatura nem variável de ambiente nova; código pequeno e 100% testável em TDD; o bloqueio por tentativas e a auditoria são nossos. **Descartadas:** Auth.js (a v4 estável é do *pages router* e não faz sessão em banco com credenciais; a v5 segue em beta); Better Auth (impõe schema e convenções próprias e usa scrypt, que não está entre as opções do doc).

### ADR-012 — Validação nas bordas e resultados tipados
**Decisão:** `zod` valida toda entrada (formulários, Server Actions, importação). Casos de uso retornam `Result<T, DomainError>` com **códigos de erro estáveis** (ex.: `INSUFFICIENT_STOCK`, `CASH_SESSION_CLOSED`, `PAYMENT_MISMATCH`), mapeados para mensagens pt-BR em um único lugar. Exceções ficam para falhas inesperadas.

### ADR-013 — Fiscal atrás de porta e assíncrono (Fase 2)
**Decisão:** interface `FiscalGateway` (emitir NFC-e, emitir NFS-e, cancelar, consultar) com adaptadores por provedor. A emissão é **assíncrona**: a venda conclui, registra-se `fiscal_documents` em `PENDING` via **outbox transacional**, e um processo atualiza o status por webhook/consulta. Detalhes em `06`.

### ADR-014 — Idioma
**Decisão:** código, identificadores, nomes de tabela/coluna, commits e mensagens técnicas em **inglês**; documentação e interface em **pt-BR**; siglas fiscais (NCM, CFOP, CSOSN, CSC) mantidas como estão. Textos de interface em catálogo único (`shared/i18n`).

### ADR-015 — Tempo
**Decisão:** `timestamptz` em UTC; exibição e "dia de negócio" em `America/Manaus`; relógio injetável (`Clock`) em todo código que usa a hora. **Consequências:** testes determinísticos; sem surpresas de fuso.

### ADR-016 — Pilha de testes
**Decisão:** Vitest (unitário/integração), Testing Library (componentes críticos), Playwright (poucos fluxos E2E), **Postgres real** nos testes de integração (container ou instância dedicada), `fast-check` para propriedades de dinheiro. Detalhes em `07`.

### ADR-017 — Preparar o boilerplate sem generalizar antes da hora
**Decisão:** **um sistema por cliente** (repositório e banco próprios). O que é específico do negócio fica isolado em `config/business.ts` (categorias sugeridas, serviços seed, taxa de deslocamento, rótulos) e nos campos de pet em `customers`. Não criar configuração, plugin ou abstração "para o próximo cliente" antes de existir o segundo. **Extração:** no segundo cliente, copiar o repositório, remover o específico e documentar o que sobrou como base. **Descartada:** multi-tenant (complexidade de isolamento sem necessidade).

### ADR-018 — Identificadores
**Decisão:** chave primária `uuid` (v4 ou v7) para entidades expostas; `sales.number` sequencial legível para humanos; `audit_log.id` `bigint`.

### ADR-019 — Mutações por Server Actions finas
**Decisão:** Server Actions apenas: validar entrada → verificar sessão/autorização → chamar **caso de uso** → mapear `Result`. Nenhuma regra de negócio na action nem em componente. Route handlers para `/api/health`, exportações (CSV/PDF) e webhooks (Fase 2).

### ADR-020 — Busca de produtos
**Decisão:** a aplicação normaliza o texto (função pura `normalizeText` em `shared`: NFD sem marcas combinantes, minúsculas, espaços colapsados) e grava o resultado em `name_normalized`; o termo buscado passa pela **mesma** função. A busca é `name_normalized ILIKE '%termo%'` com índice GIN `gin_trgm_ops` (`pg_trgm`) para busca parcial tolerante; código de barras com índice único. Ordem dos resultados: código de barras exato, nome que começa com o termo, posição do termo, nome mais curto.
**Extensões (revisão do M2, 15/11/2026):** só `pg_trgm` é necessária, e fica num schema próprio (`ext`), não em `public`. O `unaccent` do Postgres é `STABLE` (não serve em índice nem em coluna gerada) e duplicaria a regra de normalização; por isso é **removido**. A migração do M2 cria `ext`, move o `pg_trgm` e remove o `unaccent`, o que também encerra o aviso `extension_in_public` do Supabase. Plano B se o `ALTER EXTENSION` falhar no Supabase: manter o `pg_trgm` em `public` e remover só o `unaccent`.

## Estrutura de pastas

```
.
├─ CLAUDE.md
├─ docs/
├─ prisma/                 schema.prisma, migrations/ (SQL manual p/ CHECK, índices parciais), seed.ts
├─ prisma.config.ts        URL das migrações (DIRECT_URL), caminho do seed
├─ docker-compose.yml      Postgres local; docker/initdb/ cria os papéis e bancos
├─ .github/                workflows/ci.yml e actions/setup
├─ scripts/                create-user.ts, db-backup.ts, check-stock-consistency.ts, check-traceability.ts
├─ src/
│  ├─ app/                 rotas, layouts, Server Actions finas
│  ├─ modules/
│  │  ├─ auth/ catalog/ customers/ inventory/ cash-register/ sales/ reports/ import/ fiscal/ audit/
│  │  │    ├─ domain/          entidades, value objects, regras puras, erros
│  │  │    ├─ application/     casos de uso e portas (interfaces)
│  │  │    ├─ infrastructure/  repositórios Prisma/SQL e adaptadores
│  │  │    ├─ ui/              componentes e formulários do módulo
│  │  │    └─ index.ts         API pública do módulo (único ponto de entrada)
│  ├─ shared/              money, clock, ids, result, errors, validation, i18n
│  ├─ config/business.ts   especificidades do negócio (ADR-017)
│  └─ lib/                 cliente de banco, env validado, logger
└─ tests/                  e2e/, integration/, boundaries/, fixtures/ (planilhas e fixtures de fronteiras), helpers/ (factories, db de teste)
```

## Fronteiras de módulos

Regras (verificadas por lint/`dependency-cruiser` no CI):

1. Um módulo só importa de outro **via `index.ts`** (API pública) e nunca de `domain/`, `infrastructure/` ou `ui/` alheios.
2. `domain/` é **puro**: não importa Next, Prisma, zod de transporte, rede ou relógio do sistema.
3. `shared/` não importa módulos.
4. Sem dependências circulares.

Dependências permitidas:

| Módulo | Pode depender de |
|---|---|
| `shared`, `config` | nada |
| `audit` | `shared` |
| `auth` | `shared`, `audit` |
| `catalog` | `shared`, `audit` |
| `customers` | `shared`, `audit` |
| `inventory` | `shared`, `audit`, `catalog` (leitura) |
| `cash-register` | `shared`, `audit` |
| `sales` | `shared`, `audit`, `catalog`, `customers`, `inventory`, `cash-register` |
| `import` | `shared`, `audit`, `catalog`, `inventory` |
| `reports` | **leitura SQL direta** de qualquer tabela (exceção documentada: consulta somente-leitura) |
| `fiscal` (Fase 2) | `shared`, `audit`, leitura de `sales` |

O caixa **não** depende de vendas: a venda registra **movimentos de caixa** (`SALE_CASH`, `SALE_CASH_HOME`, `REFUND_CASH`) por meio da API do `cash-register`, na mesma transação. O dinheiro esperado é `abertura + Σ movimentos que afetam a gaveta` (RN-CAI-05).

## Fluxo crítico: finalizar venda

Caso de uso `completeSale(input, ctx)` em `sales/application`:

1. **Validar** entrada (zod) e autenticar (`ctx.user`).
2. **Abrir transação** (`READ COMMITTED`).
3. **Idempotência:** se já existe venda concluída com a `idempotencyKey`, retornar a **mesma venda** (a unicidade no banco serializa tentativas concorrentes).
4. **Caixa:** `SELECT … FROM cash_sessions WHERE status='OPEN' FOR SHARE`; sem sessão → `CASH_SESSION_CLOSED`.
5. **Carregar** produtos/serviços (preço de tabela, custo, dados fiscais) pelo servidor; o preço **praticado** vem do cliente e só é validado (≥ 0).
6. **Calcular (função pura de domínio):** subtotal, desconto (RN-DIN-02), parcelas do desconto por item (RN-DIN-05), `net_total`, total, e validar pagamentos/troco (RN-PAG-03). Total ≤ 0 → erro (RN-DIN-04).
7. **Baixar estoque** de cada produto, em ordem crescente de `product_id`, com o `UPDATE` condicional (ADR-008); acumular itens insuficientes; havendo falha → `INSUFFICIENT_STOCK` com a lista e *rollback*.
8. **Gravar** `sales` (status `COMPLETED`, `number`), `sale_items` (snapshot), `payments`, `stock_movements` (`SALE_OUT`, `balance_after`).
9. **Caixa:** gravar movimento de dinheiro líquido (`SALE_CASH` se `STORE`, `SALE_CASH_HOME` se `HOME_VISIT`), valor = recebido − troco.
10. **Auditoria** (`audit_log`) e, na Fase 2, **outbox fiscal** (`PENDING`) na mesma transação.
11. **Commit.** Em *deadlock*/falha de serialização, repetir até 2 vezes; depois devolver erro recuperável.

**Fechamento de caixa:** transação com `SELECT … FOR UPDATE` na sessão (espera vendas em andamento; vendas posteriores veem `CLOSED`), checa vendas em espera, calcula esperado a partir dos movimentos, grava contado/diferença e fecha.

**Devolução:** mesma disciplina — valida quantidades devolvíveis, calcula reembolso (RN-DEV-03), grava `returns`/`return_items`, movimento de estoque (`RETURN_IN` ou `LOSS`) e, se `CASH`, movimento `REFUND_CASH`.

## Padrões de código

- **Casos de uso** recebem dependências por parâmetro (repositórios, `Clock`, `IdGenerator`, `UnitOfWork`) — facilita testes e substituição.
- **Repositórios:** interface na camada `application`, implementação Prisma/SQL em `infrastructure`.
- **Erros de domínio:** objetos com `code` estável e dados úteis; nunca strings soltas.
- **Sem regra de negócio** em componentes React, Server Actions ou consultas SQL de listagem.
- **Nomenclatura de arquivos:** `kebab-case`; um caso de uso por arquivo (`complete-sale.ts`); testes ao lado (`complete-sale.test.ts`; integração `*.int.test.ts`).

## PWA

Manifest e ícones; service worker com cache de ativos estáticos e página de "sem conexão"; **sem** cache de respostas de dados para escrita. Estado do carrinho no armazenamento local por usuário/dispositivo, descartado após finalização ou logout.
