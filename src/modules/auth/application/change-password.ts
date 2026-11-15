import { recordAudit } from '@/modules/audit';
import type { Clock } from '@/shared/clock';
import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { computeLockedUntil, isLocked } from '../domain/lockout';
import { PASSWORD_MAX_LENGTH, validatePassword } from '../domain/password-policy';
import { isSessionExpired } from '../domain/session-expiry';
import type { PasswordHasher, SessionTokens, UnitOfWork } from './ports';

export type ChangePasswordDeps = {
  uow: UnitOfWork;
  hasher: PasswordHasher;
  tokens: SessionTokens;
  clock: Clock;
};

export type ChangePasswordInput = {
  userId: string;
  /** Token da sessão ATUAL (a única que continua valendo depois da troca). */
  sessionToken: string;
  currentPassword: string;
  newPassword: string;
};

/**
 * Trocar a senha (RF-AUT-03). Numa única transação: confere a sessão e a senha atual, grava o
 * novo hash, apaga TODAS as outras sessões do usuário e audita `user.password_changed` (só
 * IDs). Se qualquer passo falhar, nada muda. Errar a senha atual conta no mesmo contador de
 * falhas do login: quem roubou uma sessão não consegue adivinhar a senha sem limite.
 */
export async function changePassword(
  deps: ChangePasswordDeps,
  input: ChangePasswordInput,
): Promise<Result<void>> {
  const newPassword = validatePassword(input.newPassword);
  if (!newPassword.ok) return newPassword;

  const now = deps.clock.now();
  const currentTokenHash = deps.tokens.hash(input.sessionToken);

  return deps.uow.run(async ({ users, sessions, audit }) => {
    // A sessão informada precisa existir, valer e ser do próprio usuário.
    const session = await sessions.findByTokenHash(currentTokenHash);
    const validSession =
      session !== null &&
      session.userId === input.userId &&
      !isSessionExpired(session.expiresAt, now);
    const user = validSession ? await users.findById(input.userId) : null;
    if (!user || !user.active) return err(new DomainError('UNAUTHENTICATED'));

    if (isLocked(user.lockedUntil, now)) return err(new DomainError('ACCOUNT_LOCKED'));

    const currentMatches =
      [...input.currentPassword].length <= PASSWORD_MAX_LENGTH &&
      (await deps.hasher.verify(user.passwordHash, input.currentPassword));
    if (!currentMatches) {
      const failures = await users.registerFailure(user.id, now);
      const lockedUntil = computeLockedUntil(failures, now);
      if (lockedUntil) await users.lockUntil(user.id, lockedUntil, now);
      return err(new DomainError('CURRENT_PASSWORD_INCORRECT'));
    }

    await users.updatePasswordHash(user.id, await deps.hasher.hash(input.newPassword), now);
    await users.resetFailures(user.id, now);
    await sessions.deleteOthers(user.id, currentTokenHash);
    await recordAudit(
      { log: audit, clock: deps.clock },
      { userId: user.id, action: 'user.password_changed', entityType: 'user', entityId: user.id },
    );

    return ok(undefined);
  });
}
