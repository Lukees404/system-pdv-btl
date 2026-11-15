import { recordAudit } from '@/modules/audit';
import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { guardConflicts, type CatalogDeps } from './deps';

/**
 * Reativa o serviço (RF-CAT-07). Se outro serviço ativo já tomou o nome enquanto este estava
 * arquivado, o banco recusa (índice único parcial) e o resultado é `SERVICE_NAME_TAKEN`, com o
 * serviço ainda arquivado. Idempotente: reativar quem já está ativo não audita.
 */
export async function reactivateService(
  deps: CatalogDeps,
  input: { id: string; actorUserId: string | null },
): Promise<Result<void>> {
  const now = deps.clock.now();
  return guardConflicts(() =>
    deps.uow.run(async ({ services, audit }) => {
      const current = await services.findById(input.id);
      if (!current) return err(new DomainError('NOT_FOUND'));
      if (current.archivedAt === null) return ok(undefined);

      await services.setArchived(input.id, null, now);
      await recordAudit(
        { log: audit, clock: deps.clock },
        {
          userId: input.actorUserId,
          action: 'service.reactivated',
          entityType: 'service',
          entityId: input.id,
          data: { serviceId: input.id },
        },
      );
      return ok(undefined);
    }),
  );
}
