import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { parseCatalogName, type CatalogName } from './catalog-name';

const MAX_CATEGORY_NAME_LENGTH = 100;

/** Categoria (RN-CAT-07): nome de 1 a 100 caracteres, único sem acento e caixa (o banco garante). */
export function validateCategory(raw: string): Result<CatalogName> {
  const parsed = parseCatalogName(raw, MAX_CATEGORY_NAME_LENGTH);
  return parsed ? ok(parsed) : err(new DomainError('INVALID_NAME', { field: 'name' }));
}
