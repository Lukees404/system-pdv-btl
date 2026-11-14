# Runbook — Deploy de pré-visualização (Vercel + Supabase)

> Critério de saída do M0: o preview responde `GET /api/health` com `{"status":"ok","db":"up"}`.
> Este roteiro **não contém segredos**: senhas e URLs com senha ficam só no gerenciador de senhas, no painel da Vercel e no terminal de quem executa. Itens marcados **(validar)** dependem de comportamento do provedor que só se confirma na primeira execução.

## 0. Pré-requisitos

- Repositório no GitHub com o código (a Vercel importa dele) e o CI verde (`docs/07 §8`).
- Conta Vercel e uma organização Supabase (plano gratuito; custo de um projeto novo confirmado em US$ 0/mês).
- Decisão de hospedagem registrada em `docs/09` (OQ-24: planos gratuitos/baratos) e região dos dados documentada (RNF-LGPD-07).

## 1. Supabase: projeto

1. Criar o projeto. Região sugerida: **São Paulo (`sa-east-1`)**, perto dos usuários e dos dados no Brasil.
2. Anotar o **project ref** e a **senha do usuário `postgres`** (guardar no gerenciador de senhas).
3. Em _Connect_, copiar o host do **Supavisor** da região (formato `aws-0-<região>.pooler.supabase.com`).

Fatos da documentação do Supabase (consultada em 14/11/2026):

| Conexão                                        | Host / porta                                      | IP                    | Uso aqui                                             |
| ---------------------------------------------- | ------------------------------------------------- | --------------------- | ---------------------------------------------------- |
| Direta                                         | `db.<ref>.supabase.co:5432`                       | **só IPv6** (sem add-on pago) | evitar (redes domésticas costumam ser só IPv4)       |
| Supavisor, modo **session**                    | `aws-0-<região>.pooler.supabase.com:5432`         | IPv4                  | **migrações** (`DIRECT_URL`, só no terminal)         |
| Supavisor, modo **transaction**                | `aws-0-<região>.pooler.supabase.com:6543`         | IPv4                  | **aplicação** (`DATABASE_URL`, serverless)           |

O usuário no pooler tem o formato `<papel>.<project-ref>` (ex.: `pdv_app.<ref>`). O modo _transaction_ **não suporta _prepared statements_**: o driver `pg` não usa nomeados por padrão, mas **(validar)** que o adapter do Prisma funciona assim; se o health falhar por isso, usar temporariamente o modo _session_ (5432) com pool pequeno.

## 2. Supabase: papéis (privilégio mínimo, RNF-SEG-07)

No _SQL Editor_, trocando as senhas por valores fortes e **únicos** (gerar no gerenciador de senhas; nunca commitar):

```sql
CREATE ROLE pdv_owner LOGIN PASSWORD '<SENHA_OWNER>';
CREATE ROLE pdv_app   LOGIN PASSWORD '<SENHA_APP>';

-- O dono precisa criar objetos no schema public e extensões no banco.
GRANT USAGE, CREATE ON SCHEMA public TO pdv_owner;
GRANT CREATE ON DATABASE postgres TO pdv_owner;
```

**(validar)** No Supabase o schema `public` pertence a outro papel; se a migração-base acusar falta de permissão (por exemplo no `REVOKE CREATE … FROM PUBLIC`), ajustar aqui e **registrar o ajuste neste runbook**. A migração exige que `pdv_app` exista e falha de propósito se não existir.

## 3. Migrar o banco (do seu computador, uma vez por versão)

Defina `DIRECT_URL` **só na sessão do terminal** (modo _session_, usuário `pdv_owner`), rode e apague:

```powershell
$env:DIRECT_URL = '<postgresql://pdv_owner.<ref>:<SENHA_OWNER>@aws-0-<região>.pooler.supabase.com:5432/postgres>'
pnpm db:migrate
Remove-Item Env:DIRECT_URL
```

A migração é um passo **manual e controlado** (RNF-OPS-02), nunca automático no build. Confirmar depois, no SQL Editor: `SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm');` deve listar as duas.

## 4. Vercel: projeto

1. _Add New → Project_, importar o repositório do GitHub (Framework: Next.js, detectado sozinho; instalação com o `pnpm-lock.yaml`).
2. _Node.js Version_: 24.x (igual ao `.nvmrc`).
3. Variáveis de ambiente (_Settings → Environment Variables_, marcar como **Sensitive**), em _Preview_ e _Production_:

| Variável       | Valor                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | `postgresql://pdv_app.<ref>:<SENHA_APP>@aws-0-<região>.pooler.supabase.com:6543/postgres`     |
| `LOG_LEVEL`    | `info`                                                                                        |

**Não** cadastrar `DIRECT_URL` na Vercel: é a credencial do dono do schema e a aplicação não a usa (o schema de ambiente a trata como opcional). Também não cadastrar `TEST_*`.

4. O build roda `prisma generate && next build` e **não precisa** de variáveis (verificado localmente sem `.env`).

## 5. Verificar

- Previews da Vercel vêm com **proteção de deploy ligada**: um `Invoke-RestMethod` anônimo recebe 401. Abra a URL logado na Vercel, ou use o _protection bypass_ do projeto para o monitor.
- Esperado em `/api/health`: HTTP 200 e `{"status":"ok","db":"up"}`.
- Se vier **503**: abra _Runtime Logs_ na Vercel. O log é JSON e traz o motivo (por exemplo `INVALID_ENV` com os **nomes** das variáveis que faltam, ou o erro de conexão já sem senha).
- Conferir que a resposta não expõe nada além de `status` e `db`.

## 6. Antes da primeira tabela (M1)

O Supabase expõe, por padrão, uma API REST sobre o schema `public` e concede privilégios aos papéis `anon` e `authenticated` em tabelas novas. O PDV guarda dados pessoais de tutores e **não usa** essa API (ADR-005). Antes de criar tabelas: desligar a _Data API_ do projeto (ou revogar os privilégios padrão desses papéis) e rodar os _advisors_ de segurança. Registrar o resultado aqui.

## 7. Pendências conhecidas

- Domínio próprio e alertas de uptime (M10).
- Backup, exportação e teste de restauração (RNF-BKP, M10).
- Rotação das senhas dos papéis e o procedimento de _rollback_ (M10).
