import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  LOCKOUT_BASE_MINUTES,
  LOCKOUT_MAX_MINUTES,
  LOCKOUT_THRESHOLD,
  computeLockedUntil,
  isLocked,
  lockoutMinutes,
} from './lockout';

const now = new Date('2026-03-10T15:00:00.000Z');
const minutesAfter = (date: Date | null) => (date ? (date.getTime() - now.getTime()) / 60_000 : null);

describe('parâmetros do bloqueio', () => {
  it('[RN-ACE-05] bloqueia a partir da 5ª falha, base de 15 min e teto de 60 min (OQ-28)', () => {
    expect(LOCKOUT_THRESHOLD).toBe(5);
    expect(LOCKOUT_BASE_MINUTES).toBe(15);
    expect(LOCKOUT_MAX_MINUTES).toBe(60);
  });
});

describe('computeLockedUntil', () => {
  it.each([0, 1, 2, 3, 4])('[RN-ACE-05][RNF-SEG-03] com %i falhas seguidas não bloqueia', (failures) => {
    expect(computeLockedUntil(failures, now)).toBeNull();
  });

  it.each([
    [5, 15],
    [6, 30],
    [7, 60],
    [8, 60], // 15 × 2³ = 120, limitado ao teto
    [20, 60],
  ])('[RN-ACE-05][RNF-SEG-03] a falha nº %i bloqueia por %i minutos', (failures, minutes) => {
    expect(minutesAfter(computeLockedUntil(failures, now))).toBe(minutes);
  });

  it('[RN-ACE-05] números enormes de falhas continuam no teto (sem estourar o expoente)', () => {
    expect(minutesAfter(computeLockedUntil(100_000, now))).toBe(60);
  });

  it('[RNF-SEG-03] propriedade: bloqueio nunca diminui com mais falhas e fica entre 15 e 60 min', () => {
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 5_000 }), (failures) => {
        const current = lockoutMinutes(failures);
        const previous = lockoutMinutes(failures - 1);
        return current >= previous && current >= 15 && current <= 60;
      }),
    );
  });

  it('[RNF-SEG-03] propriedade: o desbloqueio é sempre no futuro e abaixo de 5 falhas nunca há bloqueio', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5_000 }), (failures) => {
        const until = computeLockedUntil(failures, now);
        return failures < 5 ? until === null : until !== null && until.getTime() > now.getTime();
      }),
    );
  });
});

describe('isLocked', () => {
  const lockedUntil = new Date('2026-03-10T15:15:00.000Z');

  it('[RN-ACE-05] sem locked_until nunca está bloqueado', () => {
    expect(isLocked(null, now)).toBe(false);
  });

  it('[RN-ACE-05] está bloqueado até o instante exato; nesse instante já libera', () => {
    expect(isLocked(lockedUntil, new Date('2026-03-10T15:14:59.999Z'))).toBe(true);
    expect(isLocked(lockedUntil, new Date('2026-03-10T15:15:00.000Z'))).toBe(false);
    expect(isLocked(lockedUntil, new Date('2026-03-10T16:00:00.000Z'))).toBe(false);
  });
});
