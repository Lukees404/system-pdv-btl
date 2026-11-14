/**
 * Códigos estáveis de erro de domínio (ADR-012). Os testes verificam o código,
 * nunca o texto; a mensagem em pt-BR vive no catálogo `shared/i18n` (Etapa 4).
 * Cada marco acrescenta os seus códigos aqui.
 */
export type ErrorCode =
  | 'INVALID_MONEY'
  | 'INVALID_QUANTITY'
  | 'INVALID_PERCENT'
  | 'INVALID_ALLOCATION';

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: ErrorCode, details: Record<string, unknown> = {}) {
    super(code);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}
