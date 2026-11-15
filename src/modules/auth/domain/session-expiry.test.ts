import { describe, expect, it } from 'vitest';
import { SESSION_TTL_DAYS, computeSessionExpiry, isSessionExpired } from './session-expiry';

describe('session-expiry', () => {
  const createdAt = new Date('2026-03-10T15:00:00.000Z');

  it('[RN-ACE-04] a sessão dura 30 dias', () => {
    expect(SESSION_TTL_DAYS).toBe(30);
  });

  it('[RN-ACE-04] expira exatamente 30 dias após a criação (em UTC, sem efeito de horário de verão)', () => {
    expect(computeSessionExpiry(createdAt).toISOString()).toBe('2026-04-09T15:00:00.000Z');
  });

  it('[RN-ACE-04] a sessão é válida até 1 ms antes do fim e inválida no instante exato', () => {
    const expiresAt = computeSessionExpiry(createdAt);

    expect(isSessionExpired(expiresAt, new Date(expiresAt.getTime() - 1))).toBe(false);
    expect(isSessionExpired(expiresAt, expiresAt)).toBe(true);
    expect(isSessionExpired(expiresAt, new Date(expiresAt.getTime() + 1))).toBe(true);
  });

  it('[RN-ACE-04] não altera a Date recebida', () => {
    const original = new Date(createdAt);

    computeSessionExpiry(createdAt);

    expect(createdAt.getTime()).toBe(original.getTime());
  });
});
