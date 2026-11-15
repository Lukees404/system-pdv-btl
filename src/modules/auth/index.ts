// API pública do módulo `auth` (docs/04): outros módulos e `src/app` importam só daqui.

// Casos de uso (retornam `Result`; só o script e as ações do app os chamam)
export { changePassword } from './application/change-password';
export type { ChangePasswordDeps, ChangePasswordInput } from './application/change-password';
export { createUser } from './application/create-user';
export type { CreateUserDeps, CreateUserInput } from './application/create-user';
export { login } from './application/login';
export type { LoginDeps, LoginInput, LoginSuccess } from './application/login';
export { logout } from './application/logout';
export type { LogoutDeps } from './application/logout';
export { verifySession } from './application/verify-session';
export type { SessionUser, VerifySessionDeps } from './application/verify-session';

// Camada web (sem depender do Next): ações finas, cookie e política de acesso
export { decideAccess } from './application/access-policy';
export type { AccessDecision } from './application/access-policy';
export { SESSION_COOKIE_NAMES, sessionCookieName } from './application/session-cookie';
export type { SessionCookieOptions } from './application/session-cookie';
export {
  currentUser,
  performChangePassword,
  performLogin,
  performLogout,
} from './application/session-actions';
export type {
  ActionResult,
  AuthContext,
  AuthServices,
  CookieJar,
} from './application/session-actions';

// Portas
export type { PasswordHasher, SessionTokens, UnitOfWork } from './application/ports';

// Regras que as telas precisam conhecer
export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './domain/password-policy';
export { SESSION_TTL_DAYS } from './domain/session-expiry';

// Implementações reais e fakes de teste
export { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
export { FakePasswordHasher } from './infrastructure/fake-password-hasher';
export { FakeSessionTokens } from './infrastructure/fake-session-tokens';
export { PrismaUnitOfWork } from './infrastructure/prisma-unit-of-work';
export { RandomSessionTokens } from './infrastructure/session-tokens';
