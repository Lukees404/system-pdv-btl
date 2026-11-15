import type { Logger } from '@/lib/logger';
import type { Clock } from '@/shared/clock';
import { DomainError } from '@/shared/errors';
import type { IdGenerator } from '@/shared/ids';
import { err, ok, type Result } from '@/shared/result';
import { normalizeEmail } from '../domain/email';
import { computeLockedUntil, isLocked } from '../domain/lockout';
import { PASSWORD_MAX_LENGTH } from '../domain/password-policy';
import { computeSessionExpiry } from '../domain/session-expiry';
import type { PasswordHasher, SessionTokens, UnitOfWork } from './ports';

export type LoginDeps = {
  uow: UnitOfWork;
  hasher: PasswordHasher;
  tokens: SessionTokens;
  clock: Clock;
  ids: IdGenerator;
  logger?: Logger;
};

export type LoginInput = { email: string; password: string };
export type LoginSuccess = { userId: string; token: string; expiresAt: Date };

const invalidCredentials = () => err(new DomainError('INVALID_CREDENTIALS'));

/**
 * Entrar (RF-AUT-01). Regras de segurança:
 * - e-mail inexistente, inválido, usuário inativo e senha errada dão a MESMA resposta
 *   (`INVALID_CREDENTIALS`); a conta bloqueada dá `ACCOUNT_LOCKED`, que a tela mostra com o
 *   mesmo texto (não revela se o e-mail existe).
 * - todo caminho gasta um cálculo de hash, para o tempo de resposta não revelar se o e-mail existe.
 * - falhas são contadas de forma atômica no banco (5 simultâneas bloqueiam); durante o
 *   bloqueio não se soma falha; login correto zera o contador (RN-ACE-05, RNF-SEG-03).
 * - o token vai só no retorno; o banco guarda o hash (RNF-SEG-02).
 * - logs trazem só o id do usuário, nunca e-mail, nome ou senha (RNF-LGPD-05).
 */
export async function login(deps: LoginDeps, input: LoginInput): Promise<Result<LoginSuccess>> {
  // Senha acima do limite nunca é a senha de ninguém: recusa sem gastar CPU com hash.
  if ([...input.password].length > PASSWORD_MAX_LENGTH) return invalidCredentials();

  const email = normalizeEmail(input.email);
  const now = deps.clock.now();

  return deps.uow.run(async ({ users, sessions }) => {
    const user = email.ok ? await users.findByEmail(email.value) : null;

    if (!user) {
      await deps.hasher.hash(input.password); // mesmo custo de uma verificação
      deps.logger?.warn('login.failed', { reason: 'unknown-user' });
      return invalidCredentials();
    }

    const passwordMatches = await deps.hasher.verify(user.passwordHash, input.password);

    if (!user.active) {
      deps.logger?.warn('login.failed', { userId: user.id, reason: 'inactive' });
      return invalidCredentials();
    }

    if (isLocked(user.lockedUntil, now)) {
      deps.logger?.warn('login.failed', { userId: user.id, reason: 'locked' });
      return err(new DomainError('ACCOUNT_LOCKED'));
    }

    if (!passwordMatches) {
      const failures = await users.registerFailure(user.id, now);
      const lockedUntil = computeLockedUntil(failures, now);
      if (lockedUntil) await users.lockUntil(user.id, lockedUntil, now);
      deps.logger?.warn('login.failed', {
        userId: user.id,
        reason: 'wrong-password',
        failures,
        locked: lockedUntil !== null,
      });
      return invalidCredentials();
    }

    await users.resetFailures(user.id, now);
    const token = deps.tokens.generate();
    const expiresAt = computeSessionExpiry(now);
    await sessions.create({
      id: deps.ids.next(),
      userId: user.id,
      tokenHash: deps.tokens.hash(token),
      createdAt: now,
      expiresAt,
    });

    return ok({ userId: user.id, token, expiresAt });
  });
}
