import type { Logger } from '@/lib/logger';
import type { Clock } from '@/shared/clock';
import { DomainError, type ErrorCode } from '@/shared/errors';
import { errorMessage } from '@/shared/i18n';
import type { IdGenerator } from '@/shared/ids';
import { err, type Result } from '@/shared/result';
import { changePassword } from './change-password';
import { login } from './login';
import { logout } from './logout';
import type { PasswordHasher, SessionTokens, UnitOfWork } from './ports';
import { changePasswordSchema, loginSchema } from './schemas';
import { expiredSessionCookie, sessionCookie, sessionCookieName } from './session-cookie';
import type { SessionCookieOptions } from './session-cookie';
import { verifySession, type SessionUser } from './verify-session';

/** Cookies que a ação lê e grava. No Next é `await cookies()`; nos testes, um fake em memória. */
export interface CookieJar {
  get(name: string): string | undefined;
  set(name: string, value: string, options: SessionCookieOptions): void;
  delete(name: string): void;
}

export type AuthServices = {
  uow: UnitOfWork;
  hasher: PasswordHasher;
  tokens: SessionTokens;
  clock: Clock;
  ids: IdGenerator;
  logger?: Logger;
};

export type AuthContext = { services: AuthServices; jar: CookieJar; isProduction: boolean };

/** Resultado que a tela mostra: código estável (para teste) e mensagem em pt-BR (para o usuário). */
export type ActionResult = { ok: true } | { ok: false; code: ErrorCode; message: string };

const failure = (code: ErrorCode): ActionResult => ({
  ok: false,
  code,
  message: errorMessage(code),
});
const success: ActionResult = { ok: true };

const readToken = (context: AuthContext): string =>
  context.jar.get(sessionCookieName(context.isProduction)) ?? '';

/**
 * Camada de acesso (RNF-SEG-04): o usuário da sessão atual, ou `UNAUTHENTICATED`.
 * Chamada em cada página e em cada Server Action; o proxy NÃO substitui isto.
 */
export async function currentUser(context: AuthContext): Promise<Result<SessionUser>> {
  const token = readToken(context);
  if (token === '') return err(new DomainError('UNAUTHENTICATED'));
  return verifySession(context.services, token);
}

/** Ação fina: validar (zod) → caso de uso → gravar o cookie → mapear o `Result`. */
export async function performLogin(context: AuthContext, raw: unknown): Promise<ActionResult> {
  const input = loginSchema.safeParse(raw);
  if (!input.success) return failure('INVALID_INPUT');

  const result = await login(context.services, input.data);
  if (!result.ok) return failure(result.error.code);

  const cookie = sessionCookie({
    isProduction: context.isProduction,
    token: result.value.token,
    expiresAt: result.value.expiresAt,
  });
  context.jar.set(cookie.name, cookie.value, cookie.options);
  return success;
}

/** Sair é sempre permitido e idempotente: apaga a sessão no servidor e o cookie. */
export async function performLogout(context: AuthContext): Promise<ActionResult> {
  await logout(context.services, readToken(context));
  const cleared = expiredSessionCookie(context.isProduction);
  context.jar.delete(cleared.name);
  return success;
}

/**
 * Ação fina com autorização: quem troca a senha é SEMPRE o dono da sessão (o `userId` vem da
 * sessão, nunca do formulário), então não há como trocar a senha de outra pessoa (sem IDOR).
 */
export async function performChangePassword(
  context: AuthContext,
  raw: unknown,
): Promise<ActionResult> {
  const input = changePasswordSchema.safeParse(raw);
  if (!input.success) return failure('INVALID_INPUT');

  const user = await currentUser(context);
  if (!user.ok) return failure(user.error.code);

  if (input.data.newPassword !== input.data.confirmPassword) return failure('PASSWORD_MISMATCH');

  const result = await changePassword(context.services, {
    userId: user.value.userId,
    sessionToken: readToken(context),
    currentPassword: input.data.currentPassword,
    newPassword: input.data.newPassword,
  });
  return result.ok ? success : failure(result.error.code);
}
