import { describe, expect, it } from 'vitest';
import { parseProductForm, parseServiceForm } from './catalog-forms';

const VALID = { name: 'Coleira', price: '12,50' };

function codeAndField(result: ReturnType<typeof parseProductForm>) {
  if (result.ok) return null;
  return { code: result.error.code, field: result.error.details.field };
}

describe('parseProductForm()', () => {
  it('[RF-CAT-01][RN-DIN-01] converte o preço digitado em reais para centavos', () => {
    const result = parseProductForm({ ...VALID, price: 'R$ 1.234,56' });
    expect(result.ok && result.value.priceCents).toBe(123456);
  });

  it('[RF-CAT-01] campos opcionais vazios viram "não informado"', () => {
    const result = parseProductForm({
      ...VALID,
      cost: '',
      minStock: '',
      barcode: '',
      categoryId: '',
      origin: '',
    });
    expect(result).toMatchObject({
      ok: true,
      value: { costCents: null, minStock: 0, barcode: '', categoryId: '', origin: null },
    });
  });

  it('[RF-CAT-01][RN-DIN-01] custo em reais também vira centavos', () => {
    const result = parseProductForm({ ...VALID, cost: '8,00' });
    expect(result.ok && result.value.costCents).toBe(800);
  });

  it.each(['', '12.50', 'abc', '-1', '12,505'])(
    '[RN-DIN-01][RN-CAT-01] preço "%s" é rejeitado e aponta o campo',
    (price) => {
      expect(codeAndField(parseProductForm({ ...VALID, price }))).toEqual({
        code: 'INVALID_MONEY',
        field: 'priceCents',
      });
    },
  );

  it('[RN-DIN-01] custo inválido aponta o campo do custo', () => {
    expect(codeAndField(parseProductForm({ ...VALID, cost: '1.5' }))).toEqual({
      code: 'INVALID_MONEY',
      field: 'costCents',
    });
  });

  it.each(['-1', '1,5', 'abc', '2.5'])('[RN-CAT-01] estoque mínimo "%s" é rejeitado', (v) => {
    expect(codeAndField(parseProductForm({ ...VALID, minStock: v }))).toEqual({
      code: 'INVALID_MIN_STOCK',
      field: 'minStock',
    });
  });

  it('[RN-CAT-01] estoque mínimo inteiro é aceito', () => {
    const result = parseProductForm({ ...VALID, minStock: '3' });
    expect(result.ok && result.value.minStock).toBe(3);
  });

  it('[RN-FIS-02] origem não numérica é rejeitada; o intervalo 0–8 é do domínio', () => {
    expect(codeAndField(parseProductForm({ ...VALID, origin: 'x' }))).toEqual({
      code: 'INVALID_FISCAL_FIELD',
      field: 'origin',
    });
    const result = parseProductForm({ ...VALID, origin: '5' });
    expect(result.ok && result.value.origin).toBe(5);
  });

  it('[RNF-SEG-05] entrada que não é texto ou é gigante vira INVALID_INPUT', () => {
    expect(codeAndField(parseProductForm({ name: 123, price: '1' }))?.code).toBe('INVALID_INPUT');
    expect(codeAndField(parseProductForm({ ...VALID, name: 'x'.repeat(5000) }))?.code).toBe(
      'INVALID_INPUT',
    );
    expect(codeAndField(parseProductForm(null))?.code).toBe('INVALID_INPUT');
  });

  it('[RNF-SEG-05] campos extras (como os do Next) são ignorados', () => {
    const result = parseProductForm({ ...VALID, $ACTION_ID_abc: 'x' });
    expect(result.ok).toBe(true);
  });
});

describe('parseServiceForm()', () => {
  it('[RF-CAT-07][RN-DIN-01] preço em reais vira centavos', () => {
    const result = parseServiceForm({ name: 'Consulta', price: '90,00' });
    expect(result).toMatchObject({ ok: true, value: { name: 'Consulta', priceCents: 9000 } });
  });

  it('[RN-SER-03] a taxa de deslocamento vem de uma caixa marcada ("on")', () => {
    const marked = parseServiceForm({ name: 'Taxa', price: '0', isDisplacementFee: 'on' });
    const unmarked = parseServiceForm({ name: 'Taxa', price: '0' });
    expect(marked.ok && marked.value.isDisplacementFee).toBe(true);
    expect(unmarked.ok && unmarked.value.isDisplacementFee).toBe(false);
  });

  it('[RN-DIN-01] preço inválido aponta o campo', () => {
    const result = parseServiceForm({ name: 'Consulta', price: '9.0' });
    expect(!result.ok && result.error.details.field).toBe('priceCents');
  });
});
