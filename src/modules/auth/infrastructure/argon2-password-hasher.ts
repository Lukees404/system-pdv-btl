import { hash, verify } from '@node-rs/argon2';
import type { PasswordHasher } from '../application/ports';

// Mínimo recomendado pelo OWASP para argon2id: 19 MiB de memória, 2 passes, 1 thread (RN-ACE-05).
// O algoritmo padrão da biblioteca já é argon2id; o teste confere o prefixo `$argon2id$`.
const MEMORY_COST_KIB = 19_456;
const TIME_COST = 2;
const PARALLELISM = 1;

export class Argon2PasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password, {
      memoryCost: MEMORY_COST_KIB,
      timeCost: TIME_COST,
      parallelism: PARALLELISM,
    });
  }

  async verify(storedHash: string, password: string): Promise<boolean> {
    try {
      return await verify(storedHash, password);
    } catch {
      // Hash corrompido ou de outro formato: para quem tenta entrar, é só "não confere".
      return false;
    }
  }
}
