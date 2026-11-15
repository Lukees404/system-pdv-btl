# M2 · Etapa 7 — Desempenho da busca

**1. O que foi feito.** Escrevi um teste de integração que insere 5.000 produtos num banco real e mede 50 buscas (nome parcial, com acento e caixa trocados, código de barras) e 20 páginas da listagem. O p95 deu cerca de 5,5 ms na busca e 7,4 ms na listagem, contra o limite de 300 ms. Mutei o limite para 1 ms e o teste falhou, então ele mede de verdade. Não precisei mudar a busca.

**2. Por que assim.** O requisito é busca com p95 ≤ 300 ms para 5.000 itens ([RNF-DES-01](../../docs/03-requisitos-nao-funcionais.md)), porque no balcão o dono digita e espera. Medi o caminho completo (caso de uso + SQL), não só o SQL. Inseri os dados direto no banco como dono, pois cadastrar 5.000 pelo caso de uso mediria outra coisa. A busca usa `LIKE '%termo%'` sobre o nome normalizado ([ADR-020](../../docs/04-decisoes-de-arquitetura.md)).

**3. Termo novo: p95.** É o tempo abaixo do qual ficam 95% das medições. Diferente da média, ele mostra o "pior dia normal": uma busca lenta de vez em quando importa mais para quem está atendendo do que a média boa.

**4. Pergunta para você responder sozinho.** Com 5.000 linhas o Postgres ignora o índice trigram e lê a tabela inteira, e mesmo assim é rápido. Por que o índice continua valendo a pena, e em que tamanho de catálogo ele passaria a fazer diferença?

## Com minhas palavras
