import type { Clock } from '@/shared/clock';
import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { isSessionExpired } from '../domain/session-expiry';
import type { SessionTokens, UnitOfWork } from './ports';

export type VerifySessionDeps = { uow: UnitOfWork; tokens: SessionTokens; clock: Clock };

export type SessionUser = { userId: string; sessionId: string; name: string; role: string };

const unauthenticated = () => err(new DomainError('UNAUTHENTICATED'));

/**
 * Confere o token do cookie (RN-ACE-04). Qualquer problema (token vazio, desconhecido,
 * adulterado, sessão expirada ou usuário inativo) dá o mesmo `UNAUTHENTICATED`. Uma sessão
 * expirada é apagada na hora. É a defesa REAL de cada página, ação e rota (RNF-SEG-04).
 */
export async function verifySession(
  deps: VerifySessionDeps,
  token: string,
): Promise<Result<SessionUser>> {
  if (token === '') return unauthenticated();
  const tokenHash = deps.tokens.hash(token);
  const now = deps.clock.now();

  return deps.uow.run(async ({ users, sessions }) => {
    const session = await sessions.findByTokenHash(tokenHash);
    if (!session) return unauthenticated();

    if (isSessionExpired(session.expiresAt, now)) {
      await sessions.deleteByTokenHash(tokenHash);
      return unauthenticated();
    }

    const user = await users.findById(session.userId);
    if (!user || !user.active) return unauthenticated();

    return ok({ userId: user.id, sessionId: session.id, name: user.name, role: user.role });
  });
}
