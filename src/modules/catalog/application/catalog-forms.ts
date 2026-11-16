import { z } from 'zod';
import { DomainError, type ErrorCode } from '@/shared/errors';
import { parseMoneyInput } from '@/shared/money';
import { err, ok, type Result } from '@/shared/result';
import type { ProductInput } from '../domain/product';
import type { ServiceInput } from '../domain/service';

// Leitura de formulário (borda, RNF-SEG-05, ADR-012): tudo chega como TEXTO. Aqui só se converte
// o que a tela digita (reais, números) para o que o domínio espera; as regras de negócio
// continuam em `validateProduct`/`validateService`. Tetos de tamanho barram entradas gigantes;
// campos extras (os `$ACTION_ID_*` do Next) são descartados.
const text = (max: number) => z.string().max(max);
const optionalText = (max: number) => z.string().max(max).optional();

const productSchema = z.object({
  name: text(500),
  price: text(40),
  cost: optionalText(40),
  minStock: optionalText(20),
  barcode: optionalText(200),
  categoryId: optionalText(64),
  ncm: optionalText(40),
  cest: optionalText(40),
  cfop: optionalText(40),
  csosn: optionalText(40),
  origin: optionalText(10),
  unit: optionalText(10),
});

const serviceSchema = z.object({
  name: text(500),
  price: text(40),
  isDisplacementFee: optionalText(10),
});

const fail = (code: ErrorCode, field?: string) =>
  err(new DomainError(code, field === undefined ? {} : { field }));

/** `12,50` → centavos; vazio → `null` (campo opcional). Texto ruim → erro do campo. */
function readMoney(raw: string | undefined, field: string, required: boolean) {
  const value = (raw ?? '').trim();
  if (value === '') return required ? fail('INVALID_MONEY', field) : ok(null);
  const parsed = parseMoneyInput(value);
  return parsed.ok ? ok<number | null>(parsed.value) : fail('INVALID_MONEY', field);
}

/** Produto vindo do formulário: preço e custo em reais, estoque mínimo e origem em dígitos. */
export function parseProductForm(raw: unknown): Result<ProductInput> {
  const form = productSchema.safeParse(raw);
  if (!form.success) return fail('INVALID_INPUT');
  const f = form.data;

  const price = readMoney(f.price, 'priceCents', true);
  if (!price.ok) return price;
  const cost = readMoney(f.cost, 'costCents', false);
  if (!cost.ok) return cost;

  const minStockText = (f.minStock ?? '').trim();
  if (minStockText !== '' && !/^\d+$/.test(minStockText))
    return fail('INVALID_MIN_STOCK', 'minStock');

  const originText = (f.origin ?? '').trim();
  if (originText !== '' && !/^\d+$/.test(originText)) return fail('INVALID_FISCAL_FIELD', 'origin');

  return ok({
    name: f.name,
    priceCents: price.value ?? 0,
    costCents: cost.value,
    minStock: minStockText === '' ? 0 : Number(minStockText),
    barcode: f.barcode ?? '',
    categoryId: f.categoryId ?? '',
    ncm: f.ncm,
    cest: f.cest,
    cfop: f.cfop,
    csosn: f.csosn,
    origin: originText === '' ? null : Number(originText),
    unit: f.unit,
  });
}

/** Serviço vindo do formulário; a caixa marcada chega como `"on"` (só vale ao criar, RN-SER-03). */
export function parseServiceForm(
  raw: unknown,
): Result<Required<Pick<ServiceInput, 'isDisplacementFee'>> & ServiceInput> {
  const form = serviceSchema.safeParse(raw);
  if (!form.success) return fail('INVALID_INPUT');

  const price = readMoney(form.data.price, 'priceCents', true);
  if (!price.ok) return price;

  return ok({
    name: form.data.name,
    priceCents: price.value ?? 0,
    isDisplacementFee: form.data.isDisplacementFee === 'on',
  });
}
