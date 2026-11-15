import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import {
  Argon2PasswordHasher,
  PrismaUnitOfWork,
  RandomSessionTokens,
  currentUser,
  type AuthContext,
  type CookieJar,
} from '@/modules/auth';
import { SystemClock } from '@/shared/clock';
import { UuidGenerator } from '@/shared/ids';
import { getDb } from './db';
import { getEnv } from './env';
import { getLogger } from './logger';

/** Cola entre o Next e o módulo `auth`: só código de servidor (`server-only`). */
async function nextCookieJar(): Promise<CookieJar> {
  const store = await cookies();
  return {
    get: (name) => store.get(name)?.value,
    // Gravar só funciona em Server Actions e Route Handlers (o Next barra em páginas).
    set: (name, value, options) => store.set(name, value, options),
  };
}

/** Monta as dependências reais: banco, argon2, tokens, relógio, ids e logger. */
export async function getAuthContext(): Promise<AuthContext> {
  return {
    services: {
      uow: new PrismaUnitOfWork(getDb()),
      hasher: new Argon2PasswordHasher(),
      tokens: new RandomSessionTokens(),
      clock: new SystemClock(),
      ids: new UuidGenerator(),
      logger: getLogger(),
    },
    jar: await nextCookieJar(),
    isProduction: getEnv().NODE_ENV === 'production',
  };
}

/**
 * Para PÁGINAS e layouts (RNF-SEG-04): devolve o usuário da sessão ou manda para /login.
 * `cache` evita consultar o banco mais de uma vez na mesma requisição. Server Actions não
 * usam isto: chamam `performX`, que devolve `UNAUTHENTICATED` em vez de redirecionar.
 */
export const requireUser = cache(async () => {
  const result = await currentUser(await getAuthContext());
  // Passa por uma rota que apaga o cookie velho; ir direto a /login causaria laço com o proxy.
  if (!result.ok) redirect('/api/auth/expired');
  return result.value;
});
