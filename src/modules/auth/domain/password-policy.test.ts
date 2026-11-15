import { describe, expect, it } from 'vitest';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validatePassword } from './password-policy';

const codeOf = (result: ReturnType<typeof validatePassword>) => (result.ok ? null : result.error.code);

describe('validatePassword', () => {
  it('[RN-ACE-05] os limites são 10 e 128 caracteres', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
    expect(PASSWORD_MAX_LENGTH).toBe(128);
  });

  it('[RN-ACE-05] 9 caracteres é fraca; 10 é aceita', () => {
    expect(codeOf(validatePassword('a'.repeat(9)))).toBe('WEAK_PASSWORD');
    expect(codeOf(validatePassword('a'.repeat(10)))).toBeNull();
  });

  it('[RN-ACE-05] 128 caracteres é aceita; 129 é recusada (evita abuso do hash)', () => {
    expect(codeOf(validatePassword('a'.repeat(128)))).toBeNull();
    expect(codeOf(validatePassword('a'.repeat(129)))).toBe('WEAK_PASSWORD');
  });

  it('[RN-ACE-05] string vazia é recusada', () => {
    expect(codeOf(validatePassword(''))).toBe('WEAK_PASSWORD');
  });

  it('[RN-ACE-05] o erro diz o motivo e os limites, sem repetir a senha', () => {
    const short = validatePassword('curta');
    const long = validatePassword('b'.repeat(200));

    expect(!short.ok && short.error.details).toEqual({ reason: 'too-short', min: 10, max: 128 });
    expect(!long.ok && long.error.details).toEqual({ reason: 'too-long', min: 10, max: 128 });
    expect(JSON.stringify(!short.ok && short.error.details)).not.toContain('curta');
  });

  it('[RN-ACE-05] conta caracteres Unicode (um emoji conta como 1, não como 2)', () => {
    // 9 emojis = 9 caracteres (mas 18 unidades UTF-16): deve ser recusada.
    expect(codeOf(validatePassword('😀'.repeat(9)))).toBe('WEAK_PASSWORD');
    expect(codeOf(validatePassword('😀'.repeat(10)))).toBeNull();
  });

  it('[RN-ACE-05] não impõe regras de composição (só tamanho)', () => {
    expect(codeOf(validatePassword('1234567890'))).toBeNull();
    expect(codeOf(validatePassword('          '))).toBeNull();
  });
});
