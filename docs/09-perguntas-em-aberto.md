# 09 — Perguntas em Aberto e Suposições

Cada item tem uma **suposição padrão**: se a pergunta ainda não foi respondida, siga o padrão, registre no PR que o fez e mantenha o código fácil de mudar. Ao receber a resposta, atualize a regra/requisito afetado **e** marque aqui como `Resolvida` (com data e fonte).

## Como usar

- `Aberta` → sem resposta; vale o padrão.
- `Resolvida` → resposta recebida; documento afetado atualizado.
- *Quem responde*: **Primos** (operação do negócio), **Contador** (fiscal/contábil), **Pedro** (decisão técnica/projeto).

## Para levar aos primos

| ID | Pergunta | Afeta | Suposição padrão | Status |
|---|---|---|---|---|
| OQ-01 | Quais são as colunas e o formato da planilha atual de produtos (cabeçalhos, separador, como o preço aparece)? | RN-IMP-02, M4 | Mapeamento manual de colunas | Aberta |
| OQ-05 | O dinheiro recebido em atendimento domiciliar entra na gaveta do caixa ou fica com quem atendeu? | RN-CAI-05 | Não entra na gaveta (`SALE_CASH_HOME`) | Aberta |
| OQ-06 | O atendimento domiciliar é registrado como venda no celular? Se o caixa estiver fechado, deve abrir antes? Existe a distinção loja × domicílio nos relatórios? | RN-VEN-02, RN-CAI-10 | Canal `STORE`/`HOME_VISIT`; abrir o caixa antes | Aberta |
| OQ-07 | A taxa de deslocamento só vale em atendimento domiciliar? | RN-SER-04 | Sim | Aberta |
| OQ-08 | Serviço exige cliente? Pet deve ser obrigatório? | RN-SER-06 | Cliente obrigatório; pet opcional | Aberta |
| OQ-09 | Qual o limite de vendas em espera e de desconto (máximo %, motivo obrigatório)? | RN-VEN-05/12 | 10 em espera; desconto sem limite, motivo opcional | Aberta |
| OQ-10 | Vacinas/insumos usados nos serviços devem baixar estoque? | RN-EST-12 | Não (fora do MVP) | Aberta |
| OQ-11 | A entrada de compra atualiza o custo pelo último custo ou por custo médio? | RN-EST-06 | Último custo | Aberta |
| OQ-12 | Dois produtos podem ter o mesmo nome? | RN-CAT-02 | Não entre ativos | Aberta |
| OQ-13 | Precisam registrar o número de parcelas do crédito? | RN-PAG-07 | Não | Aberta |
| OQ-14 | Pode existir venda de valor zero (brinde)? | RN-DIN-04 | Não | Aberta |
| OQ-18 | Quais categorias iniciais de produto? | `config/business.ts` | Alimentos, Brinquedos, Acessórios, Higiene | Aberta |
| OQ-20 | Como querem o comprovante (tela, PDF, WhatsApp, impressora térmica)? | RF-VEN-08 | Tela/PDF compartilhável; sem impressora | Aberta |
| OQ-25 | Horário de funcionamento; quem abre/fecha o caixa; existe mais de um caixa? | RN-CAI-01 | Caixa único; qualquer usuário abre/fecha | Aberta |
| OQ-27 | Nome do sistema/logomarca/cores? | UI/PWA | Nome genérico "PDV Pet Shop" | Aberta |

## Para levar ao contador

| ID | Pergunta | Afeta | Suposição padrão | Status |
|---|---|---|---|---|
| OQ-02 | Tabela fiscal por categoria de produto (NCM, CFOP, CSOSN, origem, CEST se houver)? | RN-FIS-02, M11 | Campos vazios; emissão bloqueada até preencher | Aberta |
| OQ-03 | NFC-e na SEFAZ-AM: é obrigatória para o perfil da empresa? Como/quando gerar o **CSC** e fazer o cadastro? Vale usar o aplicativo NFF como ponte? | `06 §3`, M11 | Fazer cadastro e CSC antes da M11 | Aberta |
| OQ-04 | NFS-e Padrão Nacional: cadastro no Emissor Nacional, **código de tributação** de cada serviço, alíquota de ISS no Simples e data de obrigatoriedade aplicável (as fontes divergem entre 01/09 e 01/11/2026)? | `06 §2/§3`, M11 | Campo `fiscal_service_code` aberto; sem validação rígida | Aberta |
| OQ-15 | Na receita líquida, a devolução conta na data da devolução ou na data da venda? | RN-DEV-07 | Data da devolução | Aberta |
| OQ-16 | LGPD: base legal e texto de aviso/consentimento para dados de tutores? | RNF-LGPD-02, RN-CLI-05 | Coleta mínima; sem consentimento digital no MVP | Aberta |
| OQ-19 | Prazo de guarda de dados de vendas e de clientes? | RNF-LGPD-06 | 5 anos para dados fiscais (confirmar) | Aberta |
| OQ-22 | Venda mista (produto + serviço): como alocar os pagamentos entre NFC-e e NFS-e? | `06 §5`, M11 | Proporcional ao total de cada documento, maior resto | Aberta |
| OQ-23 | Cancelamento/devolução com nota autorizada: prazos e procedimento? Formato do relatório/XMLs mensais? | RN-DEV-08, M8/M11 | Bloquear devolução automática com nota; procedimento manual | Aberta |
| OQ-26 | Enquanto o PDV não emite nota, usar o app gratuito da SEFAZ (NFF) ou outro emissor como ponte? | Operação | Decisão do cliente com o contador | Aberta |

## Decisões técnicas e de projeto (Pedro)

| ID | Pergunta | Afeta | Suposição padrão | Status |
|---|---|---|---|---|
| OQ-17 | Sessão persistente de 30 dias é aceitável (celulares compartilhados)? | RN-ACE-04 | 30 dias | Aberta |
| OQ-21 | Qual provedor de emissão e orçamento mensal (Focus NFe, NFE.io ou outro)? Cobre NFC-e **e** NFS-e Nacional? | M11 | Avaliar na M11 com critérios de `06` | Aberta |
| OQ-28 | Parâmetros de segurança da autenticação que os docs não fixam: duração do bloqueio, tamanho máximo da senha, tipo de expiração da sessão e mensagem de erro. | RN-ACE-04/05, RNF-SEG-03 | Sessão **absoluta** de 30 dias; senha de 10 a 128 caracteres; bloqueio a partir da 5ª falha seguida por `15 min × 2^(falhas − 5)` com teto de 60 min; mesma mensagem para credencial errada e conta bloqueada | Aberta (M1) |
| OQ-29 | Esqueci a senha: o sistema não envia e-mail. Como um dono redefine a própria senha? | RF-AUT-03, RN-ACE-06 | Fora do M1; o desenvolvedor redefine por script (a criar; o `pnpm create-user` do M1 só cria usuários novos); avaliar no M10 | Aberta |
| OQ-24 | Hospedagem e custo mensal-alvo de infraestrutura? | RNF-OPS-04, ADR-005 | Planos gratuitos/baratos (Vercel + Supabase) | Aberta |

## Suposições globais (registro)

- Um único estabelecimento e uma única inscrição estadual.
- Internet disponível na loja e, na maior parte do tempo, nos atendimentos (ADR-010).
- Os dois usuários são donos e confiam um no outro; não há segregação de funções no MVP.
- Navegadores recentes em Android 10+/iOS 15+ (RNF-COM-01).
- Volume pequeno: milhares de produtos e dezenas de vendas por dia; revisar RNF de desempenho se crescer.

## Resolvidas

*(nenhuma ainda — mover itens para cá com data e fonte da resposta)*
