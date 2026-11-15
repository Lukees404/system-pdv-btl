import { DomainError, type ErrorCode } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { parseCatalogName } from './catalog-name';
import { isNonNegativeCents } from './cents';
import { validateFiscalFields, type FiscalFields, type FiscalInput } from './fiscal';

const MAX_PRODUCT_NAME_LENGTH = 120;
const MAX_BARCODE_LENGTH = 64;

export type ProductInput = FiscalInput & {
  name: string;
  priceCents: number;
  costCents?: number | null;
  minStock?: number;
  barcode?: string | null;
  categoryId?: string | null;
};

/** Sem `stockQty`: o estoque nasce em 0 e só o módulo `inventory` o altera (ADR-007, OQ-30). */
export type ProductData = FiscalFields & {
  name: string;
  nameNormalized: string;
  barcode: string | null;
  categoryId: string | null;
  priceCents: number;
  costCents: number | null;
  minStock: number;
};

const fail = (code: ErrorCode, field: string) => err(new DomainError(code, { field }));

/**
 * Produto (RN-CAT-01/03, RN-FIS-02). Devolve o PRIMEIRO erro, na ordem do formulário: nome,
 * preço, custo, estoque mínimo, código de barras e campos fiscais; `details.field` diz qual
 * (e nunca repete o valor digitado). Que o nome e o código são únicos (RN-CAT-02/03) é
 * garantido pelo banco; que a categoria existe é do caso de uso.
 */
export function validateProduct(input: ProductInput): Result<ProductData> {
  const name = parseCatalogName(input.name, MAX_PRODUCT_NAME_LENGTH);
  if (!name) return fail('INVALID_CATALOG_NAME', 'name');

  if (!isNonNegativeCents(input.priceCents)) return fail('INVALID_MONEY', 'priceCents');

  const costCents = input.costCents ?? null;
  if (costCents !== null && !isNonNegativeCents(costCents))
    return fail('INVALID_MONEY', 'costCents');

  const minStock = input.minStock ?? 0;
  if (!Number.isSafeInteger(minStock) || minStock < 0) return fail('INVALID_MIN_STOCK', 'minStock');

  const barcode = input.barcode?.trim() ?? '';
  if (barcode.length > MAX_BARCODE_LENGTH || /\s/.test(barcode)) {
    return fail('INVALID_BARCODE', 'barcode');
  }

  const fiscal = validateFiscalFields(input);
  if (!fiscal.ok) return fiscal;

  return ok({
    ...name,
    barcode: barcode === '' ? null : barcode,
    categoryId: input.categoryId === undefined || input.categoryId === '' ? null : input.categoryId,
    priceCents: input.priceCents,
    costCents,
    minStock,
    ...fiscal.value,
  });
}
