import { createDb } from '@/lib/db';
import { FakeClock } from '@/shared/clock';
import { FakeIdGenerator } from '@/shared/ids';
import { createIsolatedDatabase, query, type IsolatedDatabase } from '../../../tests/helpers/db';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { FakePasswordHasher } from './infrastructure/fake-password-hasher';
import { FakeSessionTokens } from './infrastructure/fake-session-tokens';
import { PrismaUnitOfWork } from './infrastructure/prisma-unit-of-work';

/** Cookies em memória: registra o que as ações gravam e apagam. Só para testes. */
export class FakeCookieJar {
  readonly values = new Map<string, string>();
  readonly setCalls: { name: string; value: string; options: Record<string, unknown> }[] = [];
  readonly deleteCalls: string[] = [];

  get(name: string): string | undefined {
    return this.values.get(name);
  }
  set(name: string, value: string, options: Record<string, unknown>): void {
    this.values.set(name, value);
    this.setCalls.push({ name, value, options });
  }
  delete(name: string): void {
    this.values.delete(name);
    this.deleteCalls.push(name);
  }
}

/**
 * Apoio dos testes de integração dos casos de uso: banco isolado e migrado, relógio e ids
 * falsos, hasher rápido (e o argon2 real quando o teste precisa dele). Só para testes.
 */
export async function createAuthTestKit() {
  const database: IsolatedDatabase = await createIsolatedDatabase({ migrate: true });
  const db = createDb(database.appUrl);
  const clock = new FakeClock(new Date('2026-03-10T15:00:00.000Z'));
  const ids = new FakeIdGenerator();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeSessionTokens();
  const uow = new PrismaUnitOfWork(db);

  return {
    database,
    db,
    clock,
    ids,
    hasher,
    tokens,
    uow,
    realHasher: new Argon2PasswordHasher(),
    /** Consulta como DONO do schema (vê tudo, inclusive o que a aplicação não pode alterar). */
    owner: <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
      query<T>(database.ownerUrl, sql, params),
    async close() {
      await db.$disconnect();
      await database.drop();
    },
  };
}

export type AuthTestKit = Awaited<ReturnType<typeof createAuthTestKit>>;
