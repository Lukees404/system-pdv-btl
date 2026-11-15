/**
 * Bloqueio temporário por tentativas (RN-ACE-05, RNF-SEG-03). Parâmetros de OQ-28:
 * a partir da 5ª falha seguida, `15 min × 2^(falhas − 5)`, no máximo 60 min.
 * Funções puras: quem chama passa o "agora" (vindo do `Clock`).
 */
export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_BASE_MINUTES = 15;
export const LOCKOUT_MAX_MINUTES = 60;

const MS_PER_MINUTE = 60_000;

/** Duração do bloqueio, em minutos, depois da falha de número `failures` (≥ LOCKOUT_THRESHOLD). */
export function lockoutMinutes(failures: number): number {
  // O expoente é limitado: 2^6 × 15 já passa do teto, e 2^1000 viraria Infinity.
  const exponent = Math.min(Math.max(failures - LOCKOUT_THRESHOLD, 0), 6);
  return Math.min(LOCKOUT_BASE_MINUTES * 2 ** exponent, LOCKOUT_MAX_MINUTES);
}

/** Até quando a conta fica bloqueada após `failures` falhas seguidas; `null` se ainda não bloqueia. */
export function computeLockedUntil(failures: number, now: Date): Date | null {
  if (failures < LOCKOUT_THRESHOLD) return null;
  return new Date(now.getTime() + lockoutMinutes(failures) * MS_PER_MINUTE);
}

/** Bloqueada até o instante exato de `lockedUntil`; nele já libera. */
export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && now.getTime() < lockedUntil.getTime();
}
