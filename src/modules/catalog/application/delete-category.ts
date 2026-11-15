import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { guardConflicts, type CatalogDeps } from './deps';

/**
 * Exclui uma categoria só se estiver vazia (RF-CAT-06): com produto ligado o banco recusa
 * (FK RESTRICT) e o resultado é `CATEGORY_NOT_EMPTY`. É a única exclusão física do catálogo;
 * produtos e serviços só arquivam (RN-CAT-04).
 */
export async function deleteCategory(
  deps: CatalogDeps,
  input: { id: string },
): Promise<Result<void>> {
  return guardConflicts(() =>
    deps.uow.run(async ({ categories }) => {
      if (!(await categories.findById(input.id))) return err(new DomainError('NOT_FOUND'));
      await categories.delete(input.id);
      return ok(undefined);
    }),
  );
}
