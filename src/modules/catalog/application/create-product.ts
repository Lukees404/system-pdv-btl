import { ok, type Result } from '@/shared/result';
import { validateProduct, type ProductInput } from '../domain/product';
import { guardConflicts, type CatalogDeps } from './deps';

/**
 * Cadastra um produto (RF-CAT-01): nasce ATIVO e com estoque 0 (o estoque inicial entra no M3,
 * OQ-30). Nome repetido entre ativos, código de barras repetido e categoria inexistente são
 * decididos pelo banco (índices únicos e FK), sem consulta prévia sujeita a corrida.
 */
export async function createProduct(
  deps: CatalogDeps,
  input: ProductInput,
): Promise<Result<{ id: string }>> {
  const product = validateProduct(input);
  if (!product.ok) return product;

  const id = deps.ids.next();
  const now = deps.clock.now();
  return guardConflicts(async () => {
    await deps.uow.run(({ products }) => products.create({ id, ...product.value, now }));
    return ok({ id });
  });
}
