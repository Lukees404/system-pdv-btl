import { describe, expect, it } from 'vitest';
import { Argon2PasswordHasher } from './argon2-password-hasher';

const hasher = new Argon2PasswordHasher();

describe('Argon2PasswordHasher', () => {
  it('[RN-ACE-05] gera hash argon2id com os parâmetros mínimos do OWASP (19 MiB, 2 passes, 1 thread)', async () => {
    const hash = await hasher.hash('uma-senha-segura-123');

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it('[RN-ACE-05] o hash nunca contém a senha em claro', async () => {
    const hash = await hasher.hash('senha-que-nao-pode-vazar');

    expect(hash).not.toContain('senha-que-nao-pode-vazar');
  });

  it('[RN-ACE-05] a mesma senha gera hashes diferentes (sal aleatório)', async () => {
    const first = await hasher.hash('mesma-senha-123');
    const second = await hasher.hash('mesma-senha-123');

    expect(first).not.toBe(second);
  });

  it('[RN-ACE-05] verify aceita a senha certa e recusa a errada', async () => {
    const hash = await hasher.hash('Senha-Correta-Ção-1');

    expect(await hasher.verify(hash, 'Senha-Correta-Ção-1')).toBe(true);
    expect(await hasher.verify(hash, 'senha-correta-ção-1')).toBe(false);
    expect(await hasher.verify(hash, 'Senha-Correta-Ção-2')).toBe(false);
    expect(await hasher.verify(hash, '')).toBe(false);
  });

  it('[RN-ACE-05] funciona com a senha de tamanho máximo (128 caracteres)', async () => {
    const password = 'x'.repeat(128);
    const hash = await hasher.hash(password);

    expect(await hasher.verify(hash, password)).toBe(true);
  });

  it.each(['', 'lixo', '$argon2id$', '$argon2id$v=19$m=19456,t=2,p=1$curto$curto', '$2b$10$naoeargon'])(
    '[RN-ACE-05] hash corrompido ou de outro formato → false, nunca exceção: "%s"',
    async (corrupted) => {
      await expect(hasher.verify(corrupted, 'qualquer-senha-123')).resolves.toBe(false);
    },
  );
});
