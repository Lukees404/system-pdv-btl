import { describe, expect, it } from 'vitest';
import { validateFiscalFields } from './fiscal';

const codeOf = (result: ReturnType<typeof validateFiscalFields>) =>
  result.ok ? null : { code: result.error.code, field: result.error.details.field };

describe('validateFiscalFields', () => {
  it('[RN-FIS-02] tudo vazio é válido: campos nulos e unidade UN (emissão fica bloqueada até preencher)', () => {
    expect(validateFiscalFields({})).toEqual({
      ok: true,
      value: { ncm: null, cest: null, cfop: null, csosn: null, origin: null, unit: 'UN' },
    });
  });

  it('[RN-FIS-02] texto vazio ou só espaços conta como "não informado"', () => {
    expect(
      validateFiscalFields({ ncm: '', cest: '  ', cfop: null, csosn: undefined, unit: ' ' }),
    ).toEqual({
      ok: true,
      value: { ncm: null, cest: null, cfop: null, csosn: null, origin: null, unit: 'UN' },
    });
  });

  it('[RN-FIS-02] aceita os formatos certos, tira espaços das pontas e põe a unidade em maiúsculas', () => {
    expect(
      validateFiscalFields({
        ncm: ' 23091000 ',
        cest: '1700100',
        cfop: '5102',
        csosn: '102',
        origin: 0,
        unit: 'kg',
      }),
    ).toEqual({
      ok: true,
      value: {
        ncm: '23091000',
        cest: '1700100',
        cfop: '5102',
        csosn: '102',
        origin: 0,
        unit: 'KG',
      },
    });
  });

  it.each([
    ['ncm', '1234567'],
    ['ncm', '123456789'],
    ['ncm', '1234567a'],
    ['ncm', '2309.10.00'],
    ['cest', '123456'],
    ['cest', '12345678'],
    ['cfop', '510'],
    ['cfop', '51020'],
    ['cfop', '51a2'],
    ['csosn', '10'],
    ['csosn', '1020'],
    ['unit', 'U'],
    ['unit', 'UNI'],
    ['unit', '1N'],
  ])(
    '[RN-FIS-02] recusa %s inválido (%j) com INVALID_FISCAL_FIELD e o nome do campo',
    (field, value) => {
      expect(codeOf(validateFiscalFields({ [field]: value }))).toEqual({
        code: 'INVALID_FISCAL_FIELD',
        field,
      });
    },
  );

  it.each([9, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    '[RN-FIS-02] origem precisa ser inteiro de 0 a 8: recusa %s',
    (origin) => {
      expect(codeOf(validateFiscalFields({ origin }))).toEqual({
        code: 'INVALID_FISCAL_FIELD',
        field: 'origin',
      });
    },
  );

  it.each([0, 1, 5, 8])('[RN-FIS-02] origem %i é válida', (origin) => {
    expect(validateFiscalFields({ origin }).ok).toBe(true);
  });

  it('[RN-FIS-02] o erro nomeia o campo mas nunca repete o valor digitado', () => {
    const result = validateFiscalFields({ ncm: 'VALOR-SECRETO-123' });

    expect(JSON.stringify(!result.ok && result.error.details)).not.toContain('SECRETO');
  });
});
