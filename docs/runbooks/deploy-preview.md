# Runbook — Deploy de pré-visualização (Vercel + Supabase)

> Critério de saída do M0: o preview responde `GET /api/health` com `{"status":"ok","db":"up"}`.
> Este roteiro **não contém segredos**: senhas e URLs com senha ficam só no gerenciador de senhas, no painel da Vercel e no terminal de quem executa. Itens marcados **(validar)** dependem de comportamento do provedor que só se confirma na primeira execução.

## 0. Pré-requisitos

- Repositório no GitHub com o código (a Vercel importa dele) e o CI verde (`docs/07 §8`).
- Conta Vercel e uma organização Supabase (plano gratuito; custo de um projeto novo confirmado em US$ 0/mês).
- Decisão de hospedagem registrada em `docs/09` (OQ-24: planos gratuitos/baratos) e região dos dados documentada (RNF-LGPD-07).

## 1. Supabase: projeto

1. Criar o projeto. Região: **São Paulo (`sa-east-1`)**, perto dos usuários e dos dados no Brasil (RNF-LGPD-07). A região não muda em projeto existente; um projeto criado em `us-east-2` foi descartado ainda vazio. *Executado em 15/11/2026: projeto `system-pdv`, Postgres 17.*
2. Anotar o **project ref** e a **senha do usuário `postgres`** (guardar no gerenciador de senhas).
3. Em _Connect_, copiar o host do **Supavisor** da região (formato `aws-0-<região>.pooler.supabase.com`).

Fatos da documentação do Supabase (consultada em 14/11/2026):

| Conexão                                        | Host / porta                                      | IP                    | Uso aqui                                             |
| ---------------------------------------------- | ------------------------------------------------- | --------------------- | ---------------------------------------------------- |
| Direta                                         | `db.<ref>.supabase.co:5432`                       | **só IPv6** (sem add-on pago) | evitar (redes domésticas costumam ser só IPv4)       |
| Supavisor, modo **session**                    | `aws-0-<região>.pooler.supabase.com:5432`         | IPv4                  | **migrações** (`DIRECT_URL`, só no terminal)         |
| Supavisor, modo **transaction**                | `aws-0-<região>.pooler.supabase.com:6543`         | IPv4                  | **aplicação** (`DATABASE_URL`, serverless)           |

No painel, o _Session pooler_ aparece em **Connect → Direct** (lista de método) ou em **Connect → ORM → Prisma**. O host do projeto executado é `aws-1-sa-east-1.pooler.supabase.com` (o número `0`/`1` depende do projeto: copie do painel). O usuário no pooler tem o formato `<papel>.<project-ref>` (ex.: `pdv_app.<ref>`). O modo _transaction_ **não suporta _prepared statements_**: o driver `pg` não usa nomeados por padrão. **Validado em 15/11/2026:** o adapter `pg` do Prisma funciona no modo _transaction_ (porta 6543); o `/api/health` respondeu 200 com banco. Se um dia falhar por isso, usar temporariamente o modo _session_ (5432) com pool pequeno.

## 2. Supabase: papéis (privilégio mínimo, RNF-SEG-07)

Crie os papéis **sem senha** (um papel sem senha não autentica) e defina as senhas depois, sem digitá-las à mão:

```sql
CREATE ROLE pdv_owner LOGIN;
CREATE ROLE pdv_app   LOGIN;

-- O dono precisa criar objetos no schema public e extensões no banco.
GRANT USAGE, CREATE ON SCHEMA public TO pdv_owner;
GRANT CREATE ON DATABASE postgres TO pdv_owner;
```

**Defina cada senha sem digitar:** no PowerShell, gere uma senha aleatória (só letras e números, sem símbolos que quebrem a URL), copie o `ALTER ROLE` pronto e cole no _SQL Editor_. Use a **mesma variável** na migração; digitar a senha em dois lugares causou falhas de autenticação (`P1000`) na execução de 15/11/2026.

```powershell
$bytes = New-Object byte[] 28
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
$alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
$p = -join ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
Set-Clipboard "ALTER ROLE pdv_owner PASSWORD '$p';"   # colar e rodar no SQL Editor
```

Depois da migração, guarde a senha no gerenciador (`Set-Clipboard $p`) e apague a variável (`Remove-Variable p`). Repita o processo para o `pdv_app`.

**Resultado conferido em 15/11/2026:** o `REVOKE CREATE ON SCHEMA public FROM PUBLIC` e os `GRANT` da migração-base funcionaram no Supabase sem ajuste. A migração exige que `pdv_app` exista e falha de propósito se não existir.

## 3. Migrar o banco (do seu computador, uma vez por versão)

Defina `DIRECT_URL` **só na sessão do terminal** (modo _session_, usuário `pdv_owner`), rode e apague:

```powershell
$env:DIRECT_URL = '<postgresql://pdv_owner.<ref>:<SENHA_OWNER>@aws-0-<região>.pooler.supabase.com:5432/postgres>'
pnpm db:migrate
Remove-Item Env:DIRECT_URL
```

A migração é um passo **manual e controlado** (RNF-OPS-02), nunca automático no build. Confirmar depois, no SQL Editor: `SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm');` deve listar as duas (até a migração do M2; depois dela, só `pg_trgm`, no schema `ext`).

## 4. Vercel: projeto

1. _Add New → Project_, importar o repositório do GitHub (Framework: Next.js, detectado sozinho; instalação com o `pnpm-lock.yaml`).
2. _Node.js Version_: 24.x (igual ao `.nvmrc`). _Settings → Functions → Function Region_: **São Paulo (`gru1`)**, junto do banco; o padrão é `iad1` (Washington), que adiciona uma viagem pelos EUA a cada consulta. *(Pendente em 15/11/2026.)*
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
- **Lições da execução de 15/11/2026:**
  - Variáveis de ambiente só valem para deploys feitos **depois** de cadastradas: após criar ou alterar, faça _Redeploy_. Sem `DATABASE_URL`, o health responde 503 e o log mostra `INVALID_ENV` com `variables: ["DATABASE_URL"]`.
  - Ao colar a URL na Vercel, confira que o valor **não** contém `$q` escrito: o `$q` só vira a senha quando o PowerShell executa o `Set-Clipboard`. Use o ícone de olho para conferir antes de salvar.
  - O pooler pode recusar a primeira conexão logo depois de um `ALTER ROLE` (cache da senha antiga); uma nova tentativa funciona.
  - A proteção de deploy da Vercel (`ssoProtection`) está ligada em todos os domínios `*.vercel.app`: visitantes anônimos veem a tela de login da Vercel. Para um monitor de uptime, usar o _protection bypass_ ou um domínio próprio (M10).

## 6. Antes da primeira tabela (M1)

O Supabase expõe, por padrão, uma API REST sobre o schema `public` e concede privilégios aos papéis `anon` e `authenticated` em tabelas novas. O PDV guarda dados pessoais de tutores e **não usa** essa API (ADR-005). Antes de criar tabelas: desligar a _Data API_ do projeto (ou revogar os privilégios padrão desses papéis) e rodar os _advisors_ de segurança. Registrar o resultado aqui.

**Resultado (15/11/2026):** Data API desligada; _advisors_ de segurança só com o aviso `extension_in_public` (`unaccent`, `pg_trgm`), tratado no M2. Os privilégios padrão do `pdv_owner` concedem apenas ao `pdv_app`; `anon` e `authenticated` não recebem nada nas tabelas novas.

## 7. Implantar o M1 (autenticação) em produção

Ordem obrigatória; cada passo é seu, no terminal ou no painel (**senhas nunca no chat**):

1. **Desligar a _Data API_ do Supabase** e rodar os _advisors_ de segurança (§6). Anotar o resultado aqui.
2. **Migrar o banco** como `pdv_owner` (§3). A migração só adiciona `users`, `sessions` e `audit_log`: é compatível com o deploy antigo.
3. **Publicar o código** (`git push` na `main`; a Vercel publica sozinha e o CI roda).
4. **Criar o primeiro usuário**, com a conexão da aplicação (`pdv_app`) só na sessão do terminal:

   ```powershell
   $env:DATABASE_URL = Read-Host "DATABASE_URL (pdv_app, porta 6543)"
   pnpm create-user --name "Nome" --email "dono@exemplo.com"
   Remove-Item Env:DATABASE_URL
   ```

   O script pede a senha duas vezes, sem mostrar, e imprime só o ID. Uma segunda pessoa repete o comando.
5. **Conferir:** `GET /api/health` 200; entrar; trocar a senha; sair; abrir `/conta` sem sessão e ver o login.

Se algo der errado no passo 3, o _rollback_ do código na Vercel é seguro: as tabelas novas não atrapalham a versão anterior.

## 8. Pendências conhecidas

- **Extensões no schema `public`:** o _advisor_ de segurança do Supabase avisa (`WARN`, `extension_in_public`) que `unaccent` e `pg_trgm` estão em `public`. **Decidido no M2 (ADR-020):** uma migração nova cria o schema `ext`, move o `pg_trgm` para lá e remove o `unaccent` (não usado); o aviso deve sumir depois de migrar a produção. Plano B: manter o `pg_trgm` em `public` e remover só o `unaccent`. Não editar a migração-base já aplicada.
- `changePassword` faz o hash dentro da transação (o `login` já não faz); revisar se o uso crescer.
- Domínio próprio e alertas de uptime (M10).
- Backup, exportação e teste de restauração (RNF-BKP, M10).
- Rotação das senhas dos papéis e o procedimento de _rollback_ (M10).
