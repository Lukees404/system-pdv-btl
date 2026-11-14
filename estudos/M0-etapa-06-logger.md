# M0 · Etapa 6 — Logger estruturado com redação de PII

**1. O que foi feito.** `createLogger` escreve uma linha JSON por evento (`time`, `level`, `msg`, mais `requestId`, `userId`, `action`, `durationMs` e o que mais você passar). Mascara dados pessoais por nome de campo, em qualquer profundidade, e limpa a senha de URLs de banco dentro de textos. São 21 testes novos (108 no total).

**2. Por que assim.** Logs em JSON com o id do usuário (nunca o nome) permitem diagnosticar produção sem expor tutores ([RNF-OBS-01](../docs/03-requisitos-nao-funcionais.md), [RNF-LGPD-05](../docs/03-requisitos-nao-funcionais.md)). A hora vem do `Clock` injetado, e a saída é injetável, então o teste não toca no console. O erro de domínio vai com `code` e sem stack; um erro inesperado leva a stack, já limpa de senhas ([RNF-SEG-06](../docs/03-requisitos-nao-funcionais.md)). Quebrei a limpeza de URL e a proteção de `level`: um teste falhou em cada caso.

**3. Termo novo: redação (redaction).** Trocar o valor de um campo sensível por `[REDACTED]` antes de gravar o log, de modo que ele nunca exista no registro.

**4. Pergunta para você responder sozinho.** A redação olha o nome do campo. Que tipo de dado pessoal ela NÃO pega, e que regra de uso evita esse risco?

## Com minhas palavras

