import { recordAudit } from '@/modules/audit';
import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { guardConflicts, type CatalogDeps } from './deps';

/**
 * Arquiva o produto (RF-CAT-03, RN-CAT-04): nunca há exclusão física. Some da busca da venda e
 * continua nos relatórios. Idempotente: arquivar de novo não muda a data nem duplica a auditoria.
 */
export async function archiveProduct(
  deps: CatalogDeps,
  input: { id: string; actorUserId: string | null },
): Promise<Result<void>> {
  const now = deps.clock.now();
  return guardConflicts(() =>
    deps.uow.run(async ({ products, audit }) => {
      const current = await products.findById(input.id);
      if (!current) return err(new DomainError('NOT_FOUND'));
      if (current.archivedAt !== null) return ok(undefined);

      await products.setArchived(input.id, now, now);
      await recordAudit(
        { log: audit, clock: deps.clock },
        {
          userId: input.actorUserId,
          action: 'product.archived',
          entityType: 'product',
          entityId: input.id,
          data: { productId: input.id },
        },
      );
      return ok(undefined);
    }),
  );
}
