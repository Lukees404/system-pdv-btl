import { recordAudit } from '@/modules/audit';
import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { guardConflicts, type CatalogDeps } from './deps';

/**
 * Arquiva o serviço (RF-CAT-07, RN-CAT-04): nunca há exclusão física. Idempotente: arquivar de
 * novo não muda a data nem duplica a auditoria.
 */
export async function archiveService(
  deps: CatalogDeps,
  input: { id: string; actorUserId: string | null },
): Promise<Result<void>> {
  const now = deps.clock.now();
  return guardConflicts(() =>
    deps.uow.run(async ({ services, audit }) => {
      const current = await services.findById(input.id);
      if (!current) return err(new DomainError('NOT_FOUND'));
      if (current.archivedAt !== null) return ok(undefined);

      await services.setArchived(input.id, now, now);
      await recordAudit(
        { log: audit, clock: deps.clock },
        {
          userId: input.actorUserId,
          action: 'service.archived',
          entityType: 'service',
          entityId: input.id,
          data: { serviceId: input.id },
        },
      );
      return ok(undefined);
    }),
  );
}
