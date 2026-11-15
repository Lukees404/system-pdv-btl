import { createDb } from '@/lib/db';
import { FakeClock } from '@/shared/clock';
import { FakeIdGenerator } from '@/shared/ids';
import { createIsolatedDatabase, query, type IsolatedDatabase } from '../../../tests/helpers/db';
import { PrismaCatalogUnitOfWork } from './infrastructure/prisma-catalog-unit-of-work';

/**
 * Apoio dos testes de integração do catálogo: banco isolado e migrado, relógio e ids falsos,
 * um usuário real (a auditoria tem FK para `users`) e consulta como DONO do schema. Só para testes.
 */
export async function createCatalogTestKit() {
  const database: IsolatedDatabase = await createIsolatedDatabase({ migrate: true });
  const db = createDb(database.appUrl);
  const clock = new FakeClock(new Date('2026-03-10T15:00:00.000Z'));
  const ids = new FakeIdGenerator();
  const uow = new PrismaCatalogUnitOfWork(db);

  const [actor] = await query<{ id: string }>(
    database.ownerUrl,
    `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
     VALUES (gen_random_uuid(), 'Dono Teste', 'catalogo@exemplo.test', 'hash', now(), now())
     RETURNING id`,
  );

  return {
    database,
    db,
    clock,
    ids,
    uow,
    /** Quem faz as ações nos testes (vai para `audit_log.user_id`). */
    actorUserId: actor!.id,
    /** Dependências prontas para os casos de uso. */
    deps: { uow, clock, ids },
    /** Consulta como DONO do schema (vê tudo, inclusive o que a aplicação não pode alterar). */
    owner: <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
      query<T>(database.ownerUrl, sql, params),
    async close() {
      await db.$disconnect();
      await database.drop();
    },
  };
}

export type CatalogTestKit = Awaited<ReturnType<typeof createCatalogTestKit>>;
