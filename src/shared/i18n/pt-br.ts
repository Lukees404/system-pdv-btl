import type { ErrorCode } from '../errors';

/**
 * Catálogo único de textos da interface (ADR-014, RNF-USA-03).
 * `Record<ErrorCode, …>` faz o compilador exigir uma mensagem para cada código novo.
 */
export const errorMessages: Record<ErrorCode, string> = {
  INVALID_MONEY: 'Valor em dinheiro inválido.',
  INVALID_QUANTITY: 'A quantidade deve ser um número inteiro maior ou igual a 1.',
  INVALID_PERCENT: 'O percentual deve estar entre 0 e 100, com no máximo 2 casas decimais.',
  INVALID_ALLOCATION: 'Não foi possível ratear o valor entre os itens.',
};

export const messages = {
  'app.name': 'PDV Pet Shop',
} as const;
