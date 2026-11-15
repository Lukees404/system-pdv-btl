# M1 · Etapa 3 — Módulo `audit`

**1. O que foi feito.** Criei o módulo `audit` com as quatro camadas: `buildAuditEntry` (domínio), a porta `AuditLog` e `recordAudit` (aplicação), `PrismaAuditLog` e um fake em memória (infraestrutura). A auditoria **rejeita dados pessoais em qualquer profundidade** e grava dentro da transação de quem chama: se a ação falha, o registro some junto. São 17 testes unitários e 4 de integração, todos escritos antes (vistos falhar).

**2. Por que assim.** Toda ação sensível deixa rastro, mas o rastro nunca guarda dado pessoal, só IDs e diferenças de valores ([RN-ACE-02/03](../../docs/01-regras-de-negocio.md), [RNF-LGPD-05](../../docs/03-requisitos-nao-funcionais.md)). A lista de campos sensíveis é a mesma do logger (`shared/pii`). O erro lista só os **caminhos** (`customer.phone`), nunca os valores. Como a auditoria recebe o cliente da transação, não existe "auditoria órfã" de uma ação desfeita. Provei com duas mutações: busca só na raiz e gravação sem validar; um teste falhou em cada caso.

**3. Termo novo: transação.** Um grupo de operações no banco que valem juntas ou não valem: ou tudo é gravado (commit), ou nada (rollback). É o que garante "a troca de senha e o seu registro de auditoria" nunca ficarem um sem o outro.

**4. Pergunta para você responder sozinho.** A validação olha o **nome** dos campos de `data`. Se alguém gravar `{ note: "ligar para Maria, 92 99999-0000" }`, ela não pega. Que regra de uso (e não de código) evita isso?

## Com minhas palavras

