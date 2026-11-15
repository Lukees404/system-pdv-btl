import { ok, type Result } from '@/shared/result';
import { validateCategory } from '../domain/category';
import { guardConflicts, type CatalogDeps } from './deps';

/**
 * Cria uma categoria (RF-CAT-06, RN-CAT-07). Nome repetido (sem acento e caixa) vira
 * `CATEGORY_NAME_TAKEN`, decidido pelo índice único do banco (sem corrida). Não é auditada:
 * RN-ACE-02 não lista categorias.
 */
export async function createCategory(
  deps: CatalogDeps,
  input: { name: string },
): Promise<Result<{ id: string }>> {
  const category = validateCategory(input.name);
  if (!category.ok) return category;

  const id = deps.ids.next();
  const now = deps.clock.now();
  return guardConflicts(async () => {
    await deps.uow.run(({ categories }) => categories.create({ id, ...category.value, now }));
    return ok({ id });
  });
}
