import type { CatalogDeps } from './deps';
import type { CategoryRecord } from './ports';

/** Todas as categorias, ordenadas pelo nome normalizado (sem acento e caixa). */
export function listCategories(deps: CatalogDeps): Promise<CategoryRecord[]> {
  return deps.uow.run(({ categories }) => categories.list());
}
