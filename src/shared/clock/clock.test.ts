import { describe, expect, it } from 'vitest';
import { FakeClock, SystemClock } from './index';

describe('FakeClock', () => {
  it('[RNF-INT-06] devolve sempre o instante configurado', () => {
    const clock = new FakeClock(new Date('2026-03-10T15:00:00.000Z'));

    expect(clock.now().toISOString()).toBe('2026-03-10T15:00:00.000Z');
    expect(clock.now().toISOString()).toBe('2026-03-10T15:00:00.000Z');
  });

  it('[RNF-INT-06] advance(ms) move o relógio para frente', () => {
    const clock = new FakeClock(new Date('2026-03-10T15:00:00.000Z'));

    clock.advance(90_000);

    expect(clock.now().toISOString()).toBe('2026-03-10T15:01:30.000Z');
  });

  it('[RNF-INT-06] alterar a Date devolvida não altera o relógio', () => {
    const clock = new FakeClock(new Date('2026-03-10T15:00:00.000Z'));

    clock.now().setUTCFullYear(1999);

    expect(clock.now().toISOString()).toBe('2026-03-10T15:00:00.000Z');
  });

  it('[ADR-015] permite simular a virada de dia (03:00Z = 23:00 em Manaus)', () => {
    const clock = new FakeClock(new Date('2026-03-11T03:00:00.000Z'));

    expect(clock.now().getUTCDate()).toBe(11);
  });
});

describe('SystemClock', () => {
  it('[RNF-INT-06] now() devolve uma Date válida', () => {
    const now = new SystemClock().now();

    expect(now).toBeInstanceOf(Date);
    expect(Number.isNaN(now.getTime())).toBe(false);
  });
});
