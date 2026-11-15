import { describe, expect, it } from 'vitest';
import { validateCategory, validateService } from '@/modules/catalog';
import { normalizeText } from '@/shared/text';
import { BUSINESS } from './business';

describe('config/business (dados iniciais do pet shop)', () => {
  it('[RN-CAT-07][OQ-18] categorias sugeridas: Alimentos, Brinquedos, Acessórios e Higiene', () => {
    expect(BUSINESS.categories).toEqual(['Alimentos', 'Brinquedos', 'Acessórios', 'Higiene']);
  });

  it('[RN-SER-01] serviços do seed: consulta, vacinação, coleta de exames, limpeza de ouvido, raspado, atestado de viagem e taxa de deslocamento', () => {
    expect(BUSINESS.services.map((s) => s.name)).toEqual([
      'Consulta',
      'Vacinação',
      'Coleta de exames',
      'Limpeza de ouvido',
      'Raspado',
      'Atestado de viagem',
      'Taxa de deslocamento',
    ]);
  });

  it('[RN-SER-03] exatamente UMA taxa de deslocamento entre os serviços do seed', () => {
    const fees = BUSINESS.services.filter((s) => 'isDisplacementFee' in s && s.isDisplacementFee);

    expect(fees.map((s) => s.name)).toEqual(['Taxa de deslocamento']);
  });

  it('[RN-SER-01][OQ-31] os preços iniciais são 0 (os reais não estão nos docs; o dono edita na tela)', () => {
    for (const service of BUSINESS.services) expect(service.priceCents).toBe(0);
  });

  it('[RN-CAT-07][RN-SER-01] todos os nomes passam nas regras do domínio e não se repetem depois de normalizados', () => {
    for (const name of BUSINESS.categories) expect(validateCategory(name).ok).toBe(true);
    for (const service of BUSINESS.services) {
      expect(validateService({ ...service }).ok).toBe(true);
    }

    const categoryKeys = BUSINESS.categories.map(normalizeText);
    const serviceKeys = BUSINESS.services.map((s) => normalizeText(s.name));
    expect(new Set(categoryKeys).size).toBe(categoryKeys.length);
    expect(new Set(serviceKeys).size).toBe(serviceKeys.length);
  });
});
