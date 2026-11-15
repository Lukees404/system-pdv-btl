import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeText } from './index';

describe('normalizeText', () => {
  it.each([
    ['Ração Pré-Cozida', 'racao pre-cozida'],
    ['  AÇÃO   Ñandú  ', 'acao nandu'],
    ['Coleira\tAntipulgas\n', 'coleira antipulgas'],
    ['ÀÉÎÕÜ àéîõü', 'aeiou aeiou'],
    ['', ''],
    ['   ', ''],
  ])(
    '[RN-CAT-02][RN-CAT-03] %j vira %j (sem acento, minúsculas, espaços colapsados)',
    (input, expected) => {
      expect(normalizeText(input)).toBe(expected);
    },
  );

  it('[RN-CAT-02] formas Unicode diferentes do mesmo texto dão o mesmo resultado (NFC × NFD)', () => {
    const composed = 'Ração'; // "ç" e "ã" pré-compostos
    const decomposed = 'Ração'; // "c" + cedilha e "a" + til combinantes

    expect(normalizeText(decomposed)).toBe(normalizeText(composed));
    expect(normalizeText(decomposed)).toBe('racao');
  });

  it('[RN-CAT-02] mantém dígitos e pontuação (códigos e medidas continuam buscáveis)', () => {
    expect(normalizeText('Ração 15kg (Adulto) - 2,5%')).toBe('racao 15kg (adulto) - 2,5%');
  });

  it('[RN-CAT-02][RN-CAT-03] propriedade: é idempotente, sem maiúsculas, sem marcas e sem espaços sobrando', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (text) => {
        const once = normalizeText(text);
        return (
          normalizeText(once) === once &&
          once === once.toLowerCase() &&
          !/\p{M}/u.test(once) &&
          once === once.trim() &&
          !/\s{2,}/u.test(once)
        );
      }),
      { numRuns: 500 },
    );
  });
});
