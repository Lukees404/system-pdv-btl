import type { PasswordHasher } from '../application/ports';

/** Hasher de TESTE: instantâneo e determinístico. Nunca use fora de testes. */
export class FakePasswordHasher implements PasswordHasher {
  /** Quantas vezes `verify` foi chamado (prova a defesa contra enumeração por tempo). */
  verifyCalls = 0;

  hash(password: string): Promise<string> {
    return Promise.resolve(`fake$${password}`);
  }

  verify(storedHash: string, password: string): Promise<boolean> {
    this.verifyCalls += 1;
    return Promise.resolve(storedHash === `fake$${password}`);
  }
}
