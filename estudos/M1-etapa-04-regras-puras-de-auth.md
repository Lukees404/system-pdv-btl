# M1 · Etapa 4 — Regras puras de `auth` (domínio)

**1. O que foi feito.** Quatro funções puras em `modules/auth/domain`: política de senha (10 a 128 caracteres), bloqueio por tentativas (da 5ª falha, `15 min × 2^(falhas−5)`, teto de 60 min), expiração da sessão (30 dias exatos) e normalização de e-mail. São 42 testes, com duas propriedades em `fast-check`. Quatro mutações (limite na 6ª falha, `length` UTF-16, sem minúsculas, e outras) foram pegas.

**2. Por que assim.** Regras de negócio puras (sem banco, sem relógio) são rápidas de testar e exatas nas bordas, onde um erro de "1 a mais" vira falha de segurança ([RN-ACE-04/05](../docs/01-regras-de-negocio.md), [RNF-SEG-03](../docs/03-requisitos-nao-funcionais.md)). As funções recebem o "agora" por parâmetro, em vez de ler o relógio. A senha conta caracteres, não unidades UTF-16 (um emoji vale 1). O e-mail só aceita ASCII porque o `CHECK` do banco usa `lower()` do Postgres, que pode divergir do JavaScript em Unicode.

**3. Termo novo: função pura.** Uma função cujo resultado depende só dos argumentos e que não altera nada fora dela (sem ler hora, sem banco). Mesma entrada, mesma saída, sempre: por isso é fácil de testar e de confiar.

**4. Pergunta para você responder sozinho.** O bloqueio dobra de 15 para 30 e 60 minutos e para no teto. Que ataque o teto de 60 min evita contra os dois donos, e por que ele não evita o ataque por completo?

**Achado no caminho.** O `check:boundaries` acusou o `fast-check` dentro de um teste de domínio: minha regra do M0 proibia `lib/` em qualquer lugar do caminho (inclusive `node_modules/.../lib/`). Reproduzi com uma fixture, corrigi a regra para só olhar `src/lib/` e o teste de fronteiras ficou verde.

## Com minhas palavras

