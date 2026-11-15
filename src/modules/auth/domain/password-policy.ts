import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';

/** RN-ACE-05: no mínimo 10 caracteres; o teto de 128 (OQ-28) evita abuso do hash com entradas gigantes. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Só tamanho (sem regras de composição). Conta caracteres Unicode, não unidades UTF-16:
 * um emoji vale 1. O erro diz o motivo e os limites, nunca a senha digitada.
 */
export function validatePassword(password: string): Result<void> {
  const length = [...password].length;

  if (length < PASSWORD_MIN_LENGTH) return weak('too-short');
  if (length > PASSWORD_MAX_LENGTH) return weak('too-long');
  return ok(undefined);
}

function weak(reason: 'too-short' | 'too-long'): Result<void> {
  return err(
    new DomainError('WEAK_PASSWORD', {
      reason,
      min: PASSWORD_MIN_LENGTH,
      max: PASSWORD_MAX_LENGTH,
    }),
  );
}
