/**
 * Códigos estáveis de erro de domínio (ADR-012). Os testes verificam o código,
 * nunca o texto; a mensagem em pt-BR vive no catálogo `shared/i18n`.
 * Cada marco acrescenta os seus códigos aqui (e a mensagem no catálogo).
 */
export const ERROR_CODES = [
  'INVALID_MONEY',
  'INVALID_QUANTITY',
  'INVALID_PERCENT',
  'INVALID_ALLOCATION',
  'INVALID_ENV',
  'AUDIT_PII_FORBIDDEN',
  'WEAK_PASSWORD',
  'INVALID_EMAIL',
  'INVALID_NAME',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'ACCOUNT_LOCKED',
  'UNAUTHENTICATED',
  'CURRENT_PASSWORD_INCORRECT',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

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
