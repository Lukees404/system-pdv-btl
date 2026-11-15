import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';

const MAX_NAME_LENGTH = 100;

/** Nome de exibição: sem espaços nas pontas, de 1 a 100 caracteres. O erro não repete o nome. */
export function validateName(raw: string): Result<string> {
  const name = raw.trim();
  const length = [...name].length;

  return length >= 1 && length <= MAX_NAME_LENGTH ? ok(name) : err(new DomainError('INVALID_NAME'));
}
