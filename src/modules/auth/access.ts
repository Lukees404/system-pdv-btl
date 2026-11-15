// Entrada LEVE do módulo `auth` para o `proxy.ts`: só funções puras, sem banco, Prisma nem
// argon2. O proxy roda em toda requisição; importar o `index.ts` inteiro puxaria tudo isso.
export { decideAccess } from './application/access-policy';
export type { AccessDecision } from './application/access-policy';
export { SESSION_COOKIE_NAMES, expiredSessionCookie } from './application/session-cookie';
