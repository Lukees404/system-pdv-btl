/**
 * Porta de tempo (ADR-015). Regra de negócio nunca chama `new Date()` direto:
 * recebe um `Clock`, e o teste injeta um `FakeClock`.
 */
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** Relógio de teste: parado até alguém chamar `advance`. */
export class FakeClock implements Clock {
  private currentMs: number;

  constructor(start: Date) {
    this.currentMs = start.getTime();
  }

  now(): Date {
    // Uma Date nova a cada chamada: quem recebe não consegue alterar o relógio.
    return new Date(this.currentMs);
  }

  advance(milliseconds: number): void {
    this.currentMs += milliseconds;
  }
}
