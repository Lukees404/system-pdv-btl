import { normalizeText } from '@/shared/text';
import type { CatalogDeps } from './deps';
import type { ProductRecord } from './ports';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export type SearchProductsInput = {
  /** Texto digitado ou código de barras bipado; vazio lista todos por nome. */
  query?: string;
  /** Só a tela de gestão vê arquivados; a venda nunca (RN-CAT-04). */
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
};

/**
 * Busca e listagem (RF-CAT-04): parcial, sem acento e caixa (o termo passa pelo MESMO
 * `normalizeText` do cadastro). Código de barras exato vem primeiro. Paginada: limite de 1 a 100
 * (padrão 50) e deslocamento ≥ 0.
 */
export function searchProducts(
  deps: CatalogDeps,
  input: SearchProductsInput = {},
): Promise<ProductRecord[]> {
  const raw = input.query ?? '';
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(input.limit ?? DEFAULT_LIMIT)));
  const offset = Math.max(0, Math.trunc(input.offset ?? 0));

  return deps.uow.run(({ products }) =>
    products.search({
      normalizedTerm: normalizeText(raw),
      barcode: raw.trim(),
      includeArchived: input.includeArchived ?? false,
      limit,
      offset,
    }),
  );
}
