import type { CatalogDeps } from './deps';
import type { ProductRecord } from './ports';

/** Um produto pelo id (com estoque e campos fiscais) ou `null`. */
export function getProduct(
  deps: CatalogDeps,
  input: { id: string },
): Promise<ProductRecord | null> {
  return deps.uow.run(({ products }) => products.findById(input.id));
}
