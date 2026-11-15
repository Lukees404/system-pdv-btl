import { recordAudit } from '@/modules/audit';
import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { guardConflicts, type CatalogDeps } from './deps';

/**
 * Reativa o produto (RF-CAT-03). Se outro produto ativo já tomou o nome enquanto este estava
 * arquivado, o banco recusa (índice único parcial) e o resultado é `PRODUCT_NAME_TAKEN`, com o
 * produto ainda arquivado (RN-CAT-02). Idempotente: reativar quem já está ativo não audita.
 */
export async function reactivateProduct(
  deps: CatalogDeps,
  input: { id: string; actorUserId: string | null },
): Promise<Result<void>> {
  const now = deps.clock.now();
  return guardConflicts(() =>
    deps.uow.run(async ({ products, audit }) => {
      const current = await products.findById(input.id);
      if (!current) return err(new DomainError('NOT_FOUND'));
      if (current.archivedAt === null) return ok(undefined);

      await products.setArchived(input.id, null, now);
      await recordAudit(
        { log: audit, clock: deps.clock },
        {
          userId: input.actorUserId,
          action: 'product.reactivated',
          entityType: 'product',
          entityId: input.id,
          data: { productId: input.id },
        },
      );
      return ok(undefined);
    }),
  );
}
