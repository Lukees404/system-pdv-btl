import { randomUUID } from 'node:crypto';

/** Porta de geração de identificadores (ADR-018). */
export interface IdGenerator {
  next(): string;
}

export class UuidGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}

/** Gerador de teste: UUIDs v4 válidos e sequenciais (…0001, …0002, …). */
export class FakeIdGenerator implements IdGenerator {
  private counter = 0;

  next(): string {
    this.counter += 1;
    return `00000000-0000-4000-8000-${this.counter.toString().padStart(12, '0')}`;
  }
}
