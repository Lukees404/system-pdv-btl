import { describe, expect, it } from 'vitest';
import { validateName } from './name';

describe('validateName', () => {
  it('[RF-AUT-04] remove espaços das pontas e aceita o nome', () => {
    expect(validateName('  Maria Silva ')).toEqual({ ok: true, value: 'Maria Silva' });
  });

  it.each(['', '   ', '\n\t'])('[RF-AUT-04] rejeita nome vazio: %j', (raw) => {
    const result = validateName(raw);

    expect(!result.ok && result.error.code).toBe('INVALID_NAME');
  });

  it('[RF-AUT-04] aceita 100 caracteres e rejeita 101 (conta caracteres, não unidades UTF-16)', () => {
    expect(validateName('a'.repeat(100)).ok).toBe(true);
    expect(validateName('a'.repeat(101)).ok).toBe(false);
    expect(validateName('😀'.repeat(100)).ok).toBe(true);
  });

  it('[RF-AUT-04] o erro não repete o nome digitado', () => {
    const result = validateName(`${'Z'.repeat(150)}`);

    expect(JSON.stringify(!result.ok && result.error.details)).not.toContain('ZZZ');
  });
});
