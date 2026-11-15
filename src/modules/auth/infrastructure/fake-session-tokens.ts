import type { SessionTokens } from '../application/ports';

/** Tokens de TESTE: sequenciais e previsíveis (`token-1`, `token-2`...). Nunca use fora de testes. */
export class FakeSessionTokens implements SessionTokens {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return `token-${this.counter}`;
  }

  hash(token: string): string {
    return `hashed:${token}`;
  }
}
