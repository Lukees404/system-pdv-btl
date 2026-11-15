import { ok, type Result } from '@/shared/result';
import { validateService, type ServiceInput } from '../domain/service';
import { guardConflicts, type CatalogDeps } from './deps';

/**
 * Cria um serviço (RF-CAT-07, RN-SER-01). Nome repetido entre ativos e uma segunda taxa de
 * deslocamento são decididos pelos índices únicos do banco (sem corrida). Serviços não têm
 * estoque nem custo (RN-SER-05/07).
 */
export async function createService(
  deps: CatalogDeps,
  input: ServiceInput,
): Promise<Result<{ id: string }>> {
  const service = validateService(input);
  if (!service.ok) return service;

  const id = deps.ids.next();
  const now = deps.clock.now();
  return guardConflicts(async () => {
    await deps.uow.run(({ services }) => services.create({ id, ...service.value, now }));
    return ok({ id });
  });
}
