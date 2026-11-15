import { describe, expect, it } from 'vitest';
import { validateService } from './service';

const failure = (input: Parameters<typeof validateService>[0]) => {
  const result = validateService(input);
  return result.ok ? null : { code: result.error.code, field: result.error.details.field };
};

describe('validateService', () => {
  it('[RN-SER-01] serviço com nome e preço padrão; taxa de deslocamento é falsa por padrão', () => {
    expect(validateService({ name: ' Consulta ', priceCents: 8000 })).toEqual({
      ok: true,
      value: {
        name: 'Consulta',
        nameNormalized: 'consulta',
        priceCents: 8000,
        isDisplacementFee: false,
        fiscalServiceCode: null,
      },
    });
  });

  it('[RN-SER-03] marca a taxa de deslocamento quando informado', () => {
    expect(
      validateService({ name: 'Taxa de deslocamento', priceCents: 0, isDisplacementFee: true }),
    ).toMatchObject({ value: { isDisplacementFee: true } });
  });

  it('[RN-SER-05][RN-SER-07] o resultado não tem campos de estoque nem de custo', () => {
    const result = validateService({ name: 'Vacinação', priceCents: 12000 });

    expect(result.ok && Object.keys(result.value).sort()).toEqual([
      'fiscalServiceCode',
      'isDisplacementFee',
      'name',
      'nameNormalized',
      'priceCents',
    ]);
  });

  it.each(['', '   '])('[RN-SER-01] recusa nome vazio: %j', (name) => {
    expect(failure({ name, priceCents: 1 })).toEqual({
      code: 'INVALID_CATALOG_NAME',
      field: 'name',
    });
  });

  it('[RN-SER-01] nome de 1 a 120 caracteres', () => {
    expect(validateService({ name: 'a'.repeat(120), priceCents: 1 }).ok).toBe(true);
    expect(failure({ name: 'a'.repeat(121), priceCents: 1 })?.code).toBe('INVALID_CATALOG_NAME');
  });

  it.each([-1, 1.5, Number.NaN])('[RN-SER-01][RN-DIN-01] recusa preço %s', (priceCents) => {
    expect(failure({ name: 'Consulta', priceCents })).toEqual({
      code: 'INVALID_MONEY',
      field: 'priceCents',
    });
  });

  it('[RN-SER-01] preço padrão zero é válido (o seed começa em zero até o dono editar)', () => {
    expect(validateService({ name: 'Consulta', priceCents: 0 }).ok).toBe(true);
  });

  it('[RN-FIS-02] código fiscal do serviço é opcional e só perde os espaços das pontas', () => {
    expect(
      validateService({ name: 'Consulta', priceCents: 1, fiscalServiceCode: ' 08.01 ' }),
    ).toMatchObject({ value: { fiscalServiceCode: '08.01' } });
    expect(
      validateService({ name: 'Consulta', priceCents: 1, fiscalServiceCode: '  ' }),
    ).toMatchObject({ value: { fiscalServiceCode: null } });
  });
});
