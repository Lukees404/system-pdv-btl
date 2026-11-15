# M1 · Etapa 6 — Casos de uso de `auth` com banco real

**1. O que foi feito.** Cinco casos de uso (`createUser`, `login`, `verifySession`, `logout`, `changePassword`) sobre uma *unit of work* (uma transação do Postgres que carrega os repositórios e a auditoria). Em quatro ciclos de TDD (teste vermelho, commit, código, commit) escrevi 36 testes de integração com banco real. As regras de segurança foram provadas com mutações: contagem não atômica, falta do hash para e-mail inexistente, bloqueio ignorado, sessão expirada aceita e sessão de outra pessoa aceita.

**2. Por que assim.** A segurança mora no comportamento: 5 tentativas erradas **simultâneas** precisam bloquear, e só um Postgres real mostra uma corrida ([RNF-SEG-03](../docs/03-requisitos-nao-funcionais.md), [RN-ACE-05](../docs/01-regras-de-negocio.md)). Credencial errada, e-mail inexistente e usuário inativo dão a mesma resposta e gastam o mesmo tempo, para ninguém descobrir quais e-mails existem. A troca de senha, as sessões apagadas e a auditoria acontecem numa transação só: se um passo falha, nada muda ([RF-AUT-03](../docs/02-requisitos-funcionais.md), [RN-ACE-02](../docs/01-regras-de-negocio.md)). O token só existe no retorno e no cookie; o banco guarda o hash ([RNF-SEG-02](../docs/03-requisitos-nao-funcionais.md)).

**3. Termo novo: condição de corrida (race condition).** Quando duas operações acontecem ao mesmo tempo e o resultado depende de quem chega primeiro. Ler o contador, somar 1 e gravar "de fora" perde contagens; somar dentro do banco (`failed_attempts = failed_attempts + 1`) é atômico e não perde nenhuma.

**4. Pergunta para você responder sozinho.** Errar a senha atual na tela de troca de senha conta no mesmo contador do login. Que ataque isso impede, e que incômodo extra pode causar ao dono legítimo?

**Achado no caminho.** Revendo o código notei que `changePassword` aceitava uma sessão **expirada**. Reproduzi com um teste (vermelho), corrigi e o teste ficou verde.

## Com minhas palavras

