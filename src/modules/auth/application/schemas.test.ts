import { describe, expect, it } from 'vitest';
import { changePasswordSchema, loginSchema } from './schemas';

describe('loginSchema', () => {
  it('[RNF-SEG-05] aceita e-mail e senha como texto e ignora campos extras (ex.: os do Next)', () => {
    const parsed = loginSchema.safeParse({ email: 'a@b.co', password: 'x', $ACTION_ID_1: 'ignorado' });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).toEqual({ email: 'a@b.co', password: 'x' });
  });

  it.each([
    ['sem e-mail', { password: 'x' }],
    ['sem senha', { email: 'a@b.co' }],
    ['e-mail que não é texto', { email: 123, password: 'x' }],
    ['senha que é arquivo/objeto', { email: 'a@b.co', password: { nome: 'x' } }],
    ['e-mail gigante', { email: `${'a'.repeat(400)}@b.co`, password: 'x' }],
    ['senha gigante (abuso de memória)', { email: 'a@b.co', password: 'x'.repeat(1025) }],
  ])('[RNF-SEG-05] rejeita: %s', (_label, input) => {
    expect(loginSchema.safeParse(input).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  const valid = { currentPassword: 'atual', newPassword: 'nova', confirmPassword: 'nova' };

  it('[RNF-SEG-05] aceita os três campos de texto', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['currentPassword', 'newPassword', 'confirmPassword'])(
    '[RNF-SEG-05] rejeita quando falta ou não é texto: %s',
    (field) => {
      expect(changePasswordSchema.safeParse({ ...valid, [field]: undefined }).success).toBe(false);
      expect(changePasswordSchema.safeParse({ ...valid, [field]: 42 }).success).toBe(false);
    },
  );

  it('[RNF-SEG-05] limita o tamanho dos três campos', () => {
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: 'x'.repeat(1025) }).success).toBe(false);
  });
});
