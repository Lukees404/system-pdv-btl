import type { CatalogDeps } from './deps';
import type { ServiceRecord } from './ports';

/** Serviços pelo nome normalizado; arquivados só na tela de gestão (`includeArchived`). */
export function listServices(
  deps: CatalogDeps,
  input: { includeArchived?: boolean } = {},
): Promise<ServiceRecord[]> {
  return deps.uow.run(({ services }) =>
    services.list({ includeArchived: input.includeArchived ?? false }),
  );
}
