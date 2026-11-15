# M0 · Etapa 9 — `/api/health`

**1. O que foi feito.** `checkHealth` faz um `SELECT 1` com tempo limite de 2 s e devolve só `{ status, db }`. `healthResponse` vira HTTP 200 (ok) ou 503 (degradado), sempre com `Cache-Control: no-store`. A rota `/api/health` é só uma cola de 3 linhas. Liguei o logger ao console e ao `LOG_LEVEL` (`getLogger`). Testei na prática: 200 com o banco no ar, 503 com ele desligado, 200 de novo ao religar.

**2. Por que assim.** Um monitor de uptime precisa saber se o sistema e o banco respondem ([RNF-OBS-03](../../docs/03-requisitos-nao-funcionais.md)). A resposta nunca traz a mensagem do erro, que pode ter host ou senha; o detalhe vai só para o log, já limpo ([RNF-SEG-10](../../docs/03-requisitos-nao-funcionais.md), [RNF-OBS-01](../../docs/03-requisitos-nao-funcionais.md)). O teste real revelou que o log perdia o motivo do erro; agora o logger leva `code` e `cause`.

**3. Termo novo: health check.** Uma rota pública e barata que só responde "estou bem" ou "não estou". Serviços de monitoramento chamam de minuto em minuto e avisam você se falhar.

**4. Pergunta para você responder sozinho.** Por que o `/api/health` devolve 503 (e não 200 com `"db":"down"`) quando o banco cai? Quem lê essa resposta, e o que ele faz com o código HTTP?

## Com minhas palavras

