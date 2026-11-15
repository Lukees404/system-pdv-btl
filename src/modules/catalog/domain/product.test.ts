import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeText } from '@/shared/text';
import { validateProduct, type ProductInput } from './product';

const base: ProductInput = { name: 'Coleira Antipulgas', priceCents: 4990 };

const failure = (input: ProductInput) => {
  const result = validateProduct(input);
  return result.ok ? null : { code: result.error.code, field: result.error.details.field };
};

describe('validateProduct', () => {
  it('[RN-CAT-01] dados mínimos: preço obrigatório; custo, categoria, código e estoque mínimo ficam vazios/zero', () => {
    expect(validateProduct(base)).toEqual({
      ok: true,
      value: {
        name: 'Coleira Antipulgas',
        nameNormalized: 'coleira antipulgas',
        barcode: null,
        categoryId: null,
        priceCents: 4990,
        costCents: null,
        minStock: 0,
        ncm: null,
        cest: null,
        cfop: null,
        csosn: null,
        origin: null,
        unit: 'UN',
      },
    });
  });

  it('[RN-CAT-01][RN-CAT-02] tira espaços das pontas do nome e gera o nome normalizado (sem acento e caixa)', () => {
    const result = validateProduct({ ...base, name: '  Ração  PRÉ-Cozida ' });

    expect(result.ok && result.value.name).toBe('Ração  PRÉ-Cozida');
    expect(result.ok && result.value.nameNormalized).toBe('racao pre-cozida');
  });

  it.each(['', '   ', '\n\t'])('[RN-CAT-01] recusa nome vazio: %j', (name) => {
    expect(failure({ ...base, name })).toEqual({ code: 'INVALID_CATALOG_NAME', field: 'name' });
  });

  it('[RN-CAT-01] nome de 1 a 120 caracteres (conta caracteres, não unidades UTF-16)', () => {
    expect(validateProduct({ ...base, name: 'a'.repeat(120) }).ok).toBe(true);
    expect(validateProduct({ ...base, name: '😀'.repeat(120) }).ok).toBe(true);
    expect(failure({ ...base, name: 'a'.repeat(121) })).toEqual({
      code: 'INVALID_CATALOG_NAME',
      field: 'name',
    });
  });

  it('[RN-CAT-02] recusa nome que some ao normalizar (só marcas de acento soltas)', () => {
    expect(failure({ ...base, name: '\u0301\u0327' })).toEqual({
      code: 'INVALID_CATALOG_NAME',
      field: 'name',
    });
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    '[RN-CAT-01][RN-DIN-01] preço precisa ser inteiro em centavos e ≥ 0: recusa %s',
    (priceCents) => {
      expect(failure({ ...base, priceCents })).toEqual({
        code: 'INVALID_MONEY',
        field: 'priceCents',
      });
    },
  );

  it('[RN-CAT-01] preço zero é válido', () => {
    expect(validateProduct({ ...base, priceCents: 0 }).ok).toBe(true);
  });

  it('[RN-CAT-01] custo é opcional (null/ausente = margem N/D), mas se vier precisa ser inteiro ≥ 0', () => {
    expect(validateProduct({ ...base, costCents: null }).ok).toBe(true);
    expect(validateProduct({ ...base, costCents: 0 }).ok).toBe(true);
    expect(validateProduct({ ...base, costCents: 1250 })).toMatchObject({
      ok: true,
      value: { costCents: 1250 },
    });
    for (const costCents of [-1, 0.5, Number.NaN]) {
      expect(failure({ ...base, costCents })).toEqual({
        code: 'INVALID_MONEY',
        field: 'costCents',
      });
    }
  });

  it('[RN-CAT-01] estoque mínimo: inteiro ≥ 0 (0 = sem alerta)', () => {
    expect(validateProduct({ ...base, minStock: 0 }).ok).toBe(true);
    expect(validateProduct({ ...base, minStock: 5 })).toMatchObject({ value: { minStock: 5 } });
    for (const minStock of [-1, 1.5, Number.NaN]) {
      expect(failure({ ...base, minStock })).toEqual({
        code: 'INVALID_MIN_STOCK',
        field: 'minStock',
      });
    }
  });

  it('[RN-CAT-03] código de barras é opcional: vazio vira null e os espaços das pontas saem', () => {
    expect(validateProduct({ ...base, barcode: '' })).toMatchObject({ value: { barcode: null } });
    expect(validateProduct({ ...base, barcode: '   ' })).toMatchObject({
      value: { barcode: null },
    });
    expect(validateProduct({ ...base, barcode: ' 7891000100103 ' })).toMatchObject({
      value: { barcode: '7891000100103' },
    });
  });

  it('[RN-CAT-03] recusa código de barras com espaço no meio ou com mais de 64 caracteres', () => {
    expect(failure({ ...base, barcode: '789 1000' })).toEqual({
      code: 'INVALID_BARCODE',
      field: 'barcode',
    });
    expect(failure({ ...base, barcode: '1'.repeat(65) })).toEqual({
      code: 'INVALID_BARCODE',
      field: 'barcode',
    });
    expect(validateProduct({ ...base, barcode: '1'.repeat(64) }).ok).toBe(true);
  });

  it('[RN-CAT-01] a categoria é só repassada (vazia = sem categoria); quem confere que existe é o caso de uso', () => {
    expect(validateProduct({ ...base, categoryId: 'cat-1' })).toMatchObject({
      value: { categoryId: 'cat-1' },
    });
    expect(validateProduct({ ...base, categoryId: '' })).toMatchObject({
      value: { categoryId: null },
    });
  });

  it('[RN-FIS-02] campos fiscais inválidos são recusados e válidos entram normalizados', () => {
    expect(failure({ ...base, ncm: '123' })).toEqual({
      code: 'INVALID_FISCAL_FIELD',
      field: 'ncm',
    });
    expect(validateProduct({ ...base, ncm: '23091000', unit: 'kg' })).toMatchObject({
      value: { ncm: '23091000', unit: 'KG' },
    });
  });

  it('[RN-CAT-01] o primeiro erro segue a ordem do formulário: nome, preço, custo, estoque mínimo, código, fiscal', () => {
    const all = {
      name: '',
      priceCents: -1,
      costCents: -1,
      minStock: -1,
      barcode: 'a b',
      ncm: '1',
    };

    expect(failure(all)?.field).toBe('name');
    expect(failure({ ...all, name: 'x' })?.field).toBe('priceCents');
    expect(failure({ ...all, name: 'x', priceCents: 1 })?.field).toBe('costCents');
    expect(failure({ ...all, name: 'x', priceCents: 1, costCents: 1 })?.field).toBe('minStock');
    expect(failure({ ...all, name: 'x', priceCents: 1, costCents: 1, minStock: 1 })?.field).toBe(
      'barcode',
    );
    expect(
      failure({ ...all, name: 'x', priceCents: 1, costCents: 1, minStock: 1, barcode: '1' })?.field,
    ).toBe('ncm');
  });

  it('[RN-CAT-01] o erro não repete o nome nem o valor digitado', () => {
    const result = validateProduct({ ...base, name: 'Z'.repeat(150), barcode: 'ZZ ZZ' });

    expect(JSON.stringify(!result.ok && result.error.details)).not.toContain('ZZZ');
  });

  it('[RN-CAT-01][RN-CAT-02] propriedade: dados válidos nunca geram erro e o nome normalizado é o do normalizeText', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 120 }).filter((name) => normalizeText(name) !== ''),
        fc.integer({ min: 0, max: 1_000_000_000 }),
        fc.option(fc.integer({ min: 0, max: 1_000_000_000 }), { nil: null }),
        fc.integer({ min: 0, max: 100_000 }),
        (name, priceCents, costCents, minStock) => {
          const result = validateProduct({ name, priceCents, costCents, minStock });

          return (
            result.ok &&
            result.value.nameNormalized === normalizeText(result.value.name) &&
            result.value.priceCents === priceCents &&
            result.value.costCents === costCents &&
            result.value.minStock === minStock
          );
        },
      ),
      { numRuns: 300 },
    );
  });
});
