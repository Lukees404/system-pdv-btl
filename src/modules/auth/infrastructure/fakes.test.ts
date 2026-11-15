import { describe, expect, it } from 'vitest';
import { FakePasswordHasher } from './fake-password-hasher';
import { FakeSessionTokens } from './fake-session-tokens';

describe('FakePasswordHasher (só para testes)', () => {
  it('[RN-ACE-05] verifica a senha certa e recusa a errada, sem custo de CPU', async () => {
    const hasher = new FakePasswordHasher();
    const hash = await hasher.hash('uma-senha-123');

    expect(await hasher.verify(hash, 'uma-senha-123')).toBe(true);
    expect(await hasher.verify(hash, 'outra-senha-123')).toBe(false);
  });

  it('[RN-ACE-05] o hash falso nunca se confunde com um hash real e é recusado pelo formato errado', async () => {
    const hasher = new FakePasswordHasher();

    expect((await hasher.hash('abc1234567')).startsWith('fake$')).toBe(true);
    expect(await hasher.verify('lixo', 'abc1234567')).toBe(false);
  });

  it('[RN-ACE-05] conta quantas verificações foram feitas (para provar a defesa contra enumeração por tempo)', async () => {
    const hasher = new FakePasswordHasher();
    const hash = await hasher.hash('abc1234567');

    await hasher.verify(hash, 'x');
    await hasher.verify(hash, 'abc1234567');

    expect(hasher.verifyCalls).toBe(2);
  });
});

describe('FakeSessionTokens (só para testes)', () => {
  it('[RNF-SEG-02] gera tokens sequenciais e previsíveis', () => {
    const tokens = new FakeSessionTokens();

    expect(tokens.generate()).toBe('token-1');
    expect(tokens.generate()).toBe('token-2');
  });

  it('[RNF-SEG-02] o hash é determinístico e diferente do token', () => {
    const tokens = new FakeSessionTokens();

    expect(tokens.hash('token-1')).toBe(tokens.hash('token-1'));
    expect(tokens.hash('token-1')).not.toBe('token-1');
    expect(tokens.hash('token-1')).not.toBe(tokens.hash('token-2'));
  });
});
