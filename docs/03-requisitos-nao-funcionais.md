# 03 — Requisitos Não Funcionais

Metas são **verificáveis**. Onde o valor é uma suposição inicial, está marcado `[Suposição]` e pode ser revisado com medições reais.

## Desempenho (RNF-DES)

- **RNF-DES-01** Busca de produtos com 5.000 itens: p95 ≤ 300 ms no servidor (excluindo rede). Índices de busca conforme `05`.
- **RNF-DES-02** Finalizar venda (transação completa): p95 ≤ 1 s no servidor com até 20 itens.
- **RNF-DES-03** Telas principais após a primeira visita (cache do PWA): conteúdo útil em ≤ 3 s em celular Android intermediário com 4G `[Suposição]`.
- **RNF-DES-04** Orçamento de JavaScript inicial da tela de Venda ≤ 200 KB gzip `[Suposição]`; carregar sob demanda importação, relatórios e gráficos.
- **RNF-DES-05** Relatórios para 1 ano de dados (≈ 30 mil vendas) respondem em ≤ 2 s com agregações no banco.

## Disponibilidade e resiliência (RNF-DIS)

- **RNF-DIS-01** Meta de disponibilidade em horário comercial: 99,5% `[Suposição]`, limitada pela hospedagem escolhida.
- **RNF-DIS-02** Falha do provedor de nota fiscal não derruba o PDV (RN-FIS-05).
- **RNF-DIS-03** Sem internet: banner visível, **finalização bloqueada**, carrinho preservado no armazenamento local do navegador; ao voltar a conexão o fluxo continua sem perda (RF-SIS-03).
- **RNF-DIS-04** Toda mutação crítica é **idempotente** (RN-VEN-09) e **transacional** (RN-VEN-07), para suportar reenvio e quedas de conexão a meio caminho.

## Segurança (RNF-SEG)

Linha de base: OWASP ASVS nível 1.

- **RNF-SEG-01** HTTPS obrigatório; cabeçalhos de segurança (HSTS, `X-Content-Type-Options`, `Referrer-Policy`, CSP restritiva).
- **RNF-SEG-02** Sessão em cookie `HttpOnly`, `Secure`, `SameSite=Lax` (ou Strict); proteção CSRF em mutações.
- **RNF-SEG-03** Senhas com argon2id (ou bcrypt); limitação de tentativas de login (5 falhas → bloqueio temporário e atraso progressivo).
- **RNF-SEG-04** **Autorização verificada em toda Server Action/rota** (nunca confiar só em esconder botão); testes garantem que rotas retornam 401/403 sem sessão.
- **RNF-SEG-05** Entradas validadas no servidor com schema (zod); saída com escape padrão do framework; consultas parametrizadas (ORM/SQL parametrizado).
- **RNF-SEG-06** Segredos somente em variáveis de ambiente do provedor; nada de segredo no repositório, em logs ou em mensagens de erro. `.env*` fora do git; varredura de segredos no CI.
- **RNF-SEG-07** Usuário do banco da aplicação com privilégios mínimos (sem `UPDATE`/`DELETE` em `audit_log` e `stock_movements`).
- **RNF-SEG-08** Dependências auditadas no CI (`audit`) e atualização periódica; versões fixadas por lockfile.
- **RNF-SEG-09** Upload de imagens: validar tipo real (magic bytes), tamanho, reprocessar a imagem e armazenar com nome aleatório.
- **RNF-SEG-10** Mensagens de erro ao usuário não vazam detalhes internos; erros completos só em logs.

## Privacidade e LGPD (RNF-LGPD)

- **RNF-LGPD-01** **Minimização:** só se coleta o necessário (nome, telefone, CPF opcional, endereço opcional, dados do pet).
- **RNF-LGPD-02** **Finalidade e base legal** documentadas: atendimento/execução do contrato e emissão de nota fiscal (obrigação legal); detalhes a validar com o contador `[OQ-16]`.
- **RNF-LGPD-03** Direitos do titular atendidos: acesso (consulta do cliente), correção (edição), **anonimização** (RN-CLI-04).
- **RNF-LGPD-04** Anonimização é irreversível, mantém integridade das vendas e é auditada sem gravar dados pessoais.
- **RNF-LGPD-05** Logs e `audit_log` **sem dados pessoais** (sem nome, CPF, telefone, endereço).
- **RNF-LGPD-06** Retenção: dados de vendas conservados pelo prazo fiscal aplicável `[OQ-19]`; backups criptografados.
- **RNF-LGPD-07** Dados em regiões/provedores documentados (onde o banco e os arquivos estão hospedados).

## Integridade de dados (RNF-INT)

- **RNF-INT-01** Dinheiro em inteiros (RN-DIN-01), com `CHECK` no banco.
- **RNF-INT-02** Invariantes garantidas **no banco**, não só no código: `stock_qty ≥ 0`, uma sessão aberta, `idempotency_key` única, FKs, unicidade de código de barras (ver `05`).
- **RNF-INT-03** Movimentos de estoque, auditoria, vendas concluídas, devoluções e sessões fechadas são **imutáveis** na aplicação.
- **RNF-INT-04** Verificação de consistência: `products.stock_qty` = `Σ stock_movements` (teste automatizado e rotina de checagem).
- **RNF-INT-05** Migrações versionadas, revisáveis, reversíveis quando possível e **compatíveis com deploy sem downtime** (expandir → migrar → contrair).
- **RNF-INT-06** Datas em `timestamptz` (UTC); exibição em `America/Manaus`; relógio injetável para testes.

## Observabilidade e operação (RNF-OBS / RNF-OPS)

- **RNF-OBS-01** Logs estruturados (JSON) com `requestId`, usuário (ID, nunca nome), ação e duração.
- **RNF-OBS-02** Rastreamento de erros em produção (ex.: Sentry, plano gratuito) sem dados pessoais.
- **RNF-OBS-03** Endpoint de saúde (`/api/health`) verificando banco; checagem externa gratuita (uptime).
- **RNF-OBS-04** Métricas simples: nº de vendas/dia, falhas de finalização, falhas de nota (Fase 2).
- **RNF-OPS-01** CI em todo PR: instalar, lint, typecheck, testes (unitários + integração), build. Deploy de pré-visualização por PR.
- **RNF-OPS-02** Deploy de produção por merge na branch principal, com migrações aplicadas de forma controlada.
- **RNF-OPS-03** Variáveis de ambiente documentadas em `.env.example` (sem valores reais).
- **RNF-OPS-04** Custo mensal de infraestrutura mantido baixo; meta a definir com o cliente `[OQ-24]`.

## Backup e recuperação (RNF-BKP)

- **RNF-BKP-01** RPO ≤ 24 h e RTO ≤ 4 h `[Suposição]`.
- **RNF-BKP-02** Backup automático do banco pelo provedor **mais** exportação própria periódica (dump criptografado) guardada fora do provedor.
- **RNF-BKP-03** **Teste de restauração** documentado e executado ao menos a cada trimestre.
- **RNF-BKP-04** Arquivos (fotos) com cópia/versionamento no armazenamento.
- **RNF-BKP-05** Runbook de recuperação em `docs/runbooks/` (criado no M10).

## Usabilidade e acessibilidade (RNF-USA)

- **RNF-USA-01** Mobile-first, uso com uma mão; alvos de toque ≥ 44 px; PWA instalável.
- **RNF-USA-02** Venda típica (itens já cadastrados, um pagamento): ≤ 3 toques entre "Pagar" e a conclusão; adicionar item ≤ 2 toques após a busca.
- **RNF-USA-03** Interface em pt-BR, moeda `R$ 1.234,56`, datas `dd/mm/aaaa`, fuso `America/Manaus`; textos centralizados (sem string solta no componente).
- **RNF-USA-04** Contraste e foco conforme WCAG 2.1 AA; rótulos e mensagens de erro claras e acionáveis; verificação automática (axe) nos fluxos principais.
- **RNF-USA-05** Ações destrutivas ou irreversíveis (fechar caixa, anonimizar, devolver) exigem confirmação explícita.
- **RNF-USA-06** Erros de estoque, caixa fechado e pagamento insuficiente têm mensagens específicas, não genéricas.

## Compatibilidade (RNF-COM)

- **RNF-COM-01** Duas últimas versões estáveis de Chrome, Safari e Edge; Android 10+ e iOS 15+ `[Suposição]`.
- **RNF-COM-02** Telas de 360 px de largura até desktop.

## Manutenibilidade e portabilidade (RNF-MAN / RNF-POR)

- **RNF-MAN-01** TypeScript em modo `strict`; lint e formatação automáticos; sem `any` implícito.
- **RNF-MAN-02** Fronteiras de módulos **verificadas por ferramenta** (regra de lint/dependency-cruiser) e falhando o CI quando violadas (ADR-001).
- **RNF-MAN-03** Domínio puro (sem importar framework, ORM ou rede), testável isoladamente.
- **RNF-MAN-04** Convenções em `CLAUDE.md`; decisões em ADRs; mudanças relevantes atualizam a documentação no mesmo PR.
- **RNF-MAN-05** Toda regra de negócio tem teste citando seu ID (rastreabilidade, ver `07`).
- **RNF-POR-01** Sem dependência de recursos exclusivos do provedor de banco; Postgres padrão (ADR-005).
- **RNF-POR-02** Especificidades do negócio isoladas em `config/business.ts` e no módulo de domínio específico (ADR-017).
- **RNF-POR-03** Integrações externas (arquivos, fiscal, relógio) atrás de **portas** com adaptadores substituíveis.
