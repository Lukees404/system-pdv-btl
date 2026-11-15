import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { validateCategory } from '../domain/category';
import { guardConflicts, type CatalogDeps } from './deps';

/**
 * Renomeia a categoria (RF-CAT-06). O id não muda, então os produtos ligados continuam ligados
 * e passam a mostrar o nome novo. Pode mudar só caixa/acento do próprio nome; tomar o nome de
 * OUTRA categoria vira `CATEGORY_NAME_TAKEN`.
 */
export async function renameCategory(
  deps: CatalogDeps,
  input: { id: string; name: string },
): Promise<Result<void>> {
  const category = validateCategory(input.name);
  if (!category.ok) return category;

  const now = deps.clock.now();
  return guardConflicts(() =>
    deps.uow.run(async ({ categories }) => {
      if (!(await categories.findById(input.id))) return err(new DomainError('NOT_FOUND'));
      await categories.rename(input.id, category.value, now);
      return ok(undefined);
    }),
  );
}
