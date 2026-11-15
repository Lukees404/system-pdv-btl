/** RN-ACE-04: sessão absoluta de 30 dias (OQ-17/OQ-28), sem renovação a cada acesso. */
export const SESSION_TTL_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Instante em que a sessão criada em `createdAt` deixa de valer (aritmética em UTC). */
export function computeSessionExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + SESSION_TTL_DAYS * MS_PER_DAY);
}

/** Válida até 1 ms antes de `expiresAt`; no instante exato já está expirada. */
export function isSessionExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() >= expiresAt.getTime();
}
