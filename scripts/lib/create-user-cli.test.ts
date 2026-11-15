import { describe, expect, it } from 'vitest';
import { checkPasswordConfirmation, parseCreateUserArgs } from './create-user-cli';

describe('parseCreateUserArgs', () => {
  it('[RF-AUT-04] aceita --name e --email (formas "--flag valor" e "--flag=valor")', () => {
    expect(parseCreateUserArgs(['--name', 'Ana Paula', '--email=ana@exemplo.com'])).toEqual({
      ok: true,
      value: { name: 'Ana Paula', email: 'ana@exemplo.com' },
    });
  });

  it('[RF-AUT-04] sem argumentos devolve campos vazios (o script pergunta)', () => {
    expect(parseCreateUserArgs([])).toEqual({ ok: true, value: {} });
  });

  it('[RF-AUT-04][RNF-SEG-06] recusa --password: senha em argumento vai para o histórico do shell', () => {
    for (const argv of [['--password', 'x'], ['--password=x'], ['-p', 'x']]) {
      const result = parseCreateUserArgs(argv);
      expect(result.ok).toBe(false);
      expect(result.ok ? '' : result.message).toContain('senha');
    }
  });

  it('[RF-AUT-04] recusa argumento desconhecido e flag sem valor', () => {
    expect(parseCreateUserArgs(['--role', 'ADMIN']).ok).toBe(false);
    expect(parseCreateUserArgs(['--name']).ok).toBe(false);
    expect(parseCreateUserArgs(['solto']).ok).toBe(false);
  });
});

describe('checkPasswordConfirmation', () => {
  it('[RF-AUT-04] só aceita se a confirmação for idêntica', () => {
    expect(checkPasswordConfirmation('abc', 'abc')).toBe(true);
    expect(checkPasswordConfirmation('abc', 'abd')).toBe(false);
    expect(checkPasswordConfirmation('abc', '')).toBe(false);
  });
});
