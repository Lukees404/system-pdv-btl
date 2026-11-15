import { describe, expect, it } from 'vitest';
import { validateCategory } from './category';

describe('validateCategory', () => {
  it('[RN-CAT-07] tira espaços das pontas e gera o nome normalizado', () => {
    expect(validateCategory('  Acessórios ')).toEqual({
      ok: true,
      value: { name: 'Acessórios', nameNormalized: 'acessorios' },
    });
  });

  it.each(['', '   ', '\u0301'])(
    '[RN-CAT-07] recusa nome vazio ou que some ao normalizar: %j',
    (raw) => {
      const result = validateCategory(raw);

      expect(!result.ok && result.error.code).toBe('INVALID_NAME');
    },
  );

  it('[RN-CAT-07] nome de 1 a 100 caracteres', () => {
    expect(validateCategory('a'.repeat(100)).ok).toBe(true);
    expect(validateCategory('a'.repeat(101)).ok).toBe(false);
  });
});
