import { describe, expect, it } from 'vitest';
import { normalizeEmail } from './email';

describe('normalizeEmail', () => {
  it('[RN-ACE-01] remove espaços das pontas e passa para minúsculas', () => {
    const result = normalizeEmail('  Maria.Silva@Exemplo.COM \n');

    expect(result).toEqual({ ok: true, value: 'maria.silva@exemplo.com' });
  });

  it('[RN-ACE-01] mantém +tag e pontos do identificador', () => {
    expect(normalizeEmail('a.b+loja@exemplo.com.br')).toEqual({
      ok: true,
      value: 'a.b+loja@exemplo.com.br',
    });
  });

  it('[RN-ACE-01] é idempotente: normalizar de novo não muda nada', () => {
    const first = normalizeEmail('  ABC@Exemplo.com ');
    const second = first.ok ? normalizeEmail(first.value) : first;

    expect(second).toEqual(first);
  });

  it.each([
    '',
    '   ',
    'sem-arroba',
    '@exemplo.com',
    'usuario@',
    'usuario@dominio',
    'dois@@exemplo.com',
    'com espaco@exemplo.com',
    'a@b c.com',
  ])('[RN-ACE-01] rejeita o formato inválido: "%s"', (raw) => {
    const result = normalizeEmail(raw);

    expect(!result.ok && result.error.code).toBe('INVALID_EMAIL');
  });

  it('[RN-ACE-01] rejeita e-mail com mais de 254 caracteres', () => {
    const tooLong = `${'a'.repeat(250)}@exemplo.com`;

    const result = normalizeEmail(tooLong);

    expect(!result.ok && result.error.code).toBe('INVALID_EMAIL');
  });

  it('[RN-ACE-01] aceita só ASCII: minúsculas do JavaScript e do banco (CHECK) precisam coincidir', () => {
    const result = normalizeEmail('josé@exemplo.com');

    expect(!result.ok && result.error.code).toBe('INVALID_EMAIL');
  });

  it('[RN-ACE-01] o erro não repete o e-mail digitado', () => {
    const result = normalizeEmail('quase@@exemplo.com');

    expect(JSON.stringify(!result.ok && result.error.details)).not.toContain('quase');
  });
});
