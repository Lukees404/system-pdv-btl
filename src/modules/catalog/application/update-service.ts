import { recordAudit } from '@/modules/audit';
import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { validateService } from '../domain/service';
import { guardConflicts, type CatalogDeps } from './deps';

export type UpdateServiceInput = {
  id: string;
  actorUserId: string | null;
  name: string;
  priceCents: number;
  fiscalServiceCode?: string | null;
};

/**
 * Edita um serviço (RF-CAT-07). Mudar o preço padrão grava `service.price_changed` (antes/depois
 * em centavos) NA MESMA transação (RN-ACE-02). A marca de taxa de deslocamento não se altera
 * depois de criada: é a identidade da taxa única (RN-SER-03).
 */
export async function updateService(
  deps: CatalogDeps,
  input: UpdateServiceInput,
): Promise<Result<void>> {
  const service = validateService({
    name: input.name,
    priceCents: input.priceCents,
    fiscalServiceCode: input.fiscalServiceCode,
  });
  if (!service.ok) return service;

  const { name, nameNormalized, priceCents, fiscalServiceCode } = service.value;
  const now = deps.clock.now();
  return guardConflicts(() =>
    deps.uow.run(async ({ services, audit }) => {
      const current = await services.findById(input.id);
      if (!current) return err(new DomainError('NOT_FOUND'));

      await services.update(input.id, { name, nameNormalized, priceCents, fiscalServiceCode }, now);

      if (priceCents !== current.priceCents) {
        await recordAudit(
          { log: audit, clock: deps.clock },
          {
            userId: input.actorUserId,
            action: 'service.price_changed',
            entityType: 'service',
            entityId: input.id,
            data: { before: { priceCents: current.priceCents }, after: { priceCents } },
          },
        );
      }
      return ok(undefined);
    }),
  );
}
