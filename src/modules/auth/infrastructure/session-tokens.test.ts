import { describe, expect, it } from 'vitest';
import { RandomSessionTokens } from './session-tokens';

const tokens = new RandomSessionTokens();

describe('RandomSessionTokens', () => {
  it('[RNF-SEG-02] o token tem 32 bytes aleatórios em base64url (43 caracteres, seguro para cookie)', () => {
    const token = tokens.generate();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
  });

  it('[RNF-SEG-02] 1.000 tokens são todos diferentes', () => {
    const generated = new Set(Array.from({ length: 1000 }, () => tokens.generate()));

    expect(generated.size).toBe(1000);
  });

  it('[RNF-SEG-02] o hash é SHA-256 em hex (vetor conhecido: "abc")', () => {
    expect(tokens.hash('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('[RNF-SEG-02] o hash é determinístico, tem 64 caracteres e é diferente do token', () => {
    const token = tokens.generate();

    expect(tokens.hash(token)).toBe(tokens.hash(token));
    expect(tokens.hash(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(tokens.hash(token)).not.toBe(token);
  });

  it('[RNF-SEG-02] tokens diferentes têm hashes diferentes', () => {
    expect(tokens.hash(tokens.generate())).not.toBe(tokens.hash(tokens.generate()));
  });
});
