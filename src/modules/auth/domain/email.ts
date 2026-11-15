import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';

const MAX_EMAIL_LENGTH = 254;
// Só ASCII imprimível, sem espaços e com exatamente um `@`: o CHECK do banco compara com
// `lower(btrim(email))`, e as minúsculas de Unicode do JavaScript e do Postgres podem divergir.
const EMAIL_FORMAT = /^[\x21-\x7e]+@[\x21-\x7e]+\.[\x21-\x7e]+$/;

/**
 * Normaliza o e-mail (`trim` + minúsculas) e valida o formato (RN-ACE-01). O valor
 * normalizado é o que vai para o índice único e para o `CHECK` da tabela `users`.
 * O erro não repete o e-mail digitado.
 */
export function normalizeEmail(raw: string): Result<string> {
  const email = raw.trim().toLowerCase();
  const isValid =
    email.length <= MAX_EMAIL_LENGTH && EMAIL_FORMAT.test(email) && email.split('@').length === 2;

  return isValid ? ok(email) : err(new DomainError('INVALID_EMAIL'));
}
