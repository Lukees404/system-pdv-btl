import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createIsolatedDatabase, type IsolatedDatabase } from '../../tests/helpers/db';
import { createDb } from './db';

describe('createDb (Prisma + adapter pg)', () => {
  let database: IsolatedDatabase;

  beforeAll(async () => {
    database = await createIsolatedDatabase({ migrate: true });
  }, 60_000);
  afterAll(async () => {
    await database.drop();
  });

  it('[ADR-004] conecta como pdv_app e executa SQL parametrizado', async () => {
    const db = createDb(database.appUrl);

    try {
      const [row] = await db.$queryRaw<{ who: string; doubled: number }[]>`
        SELECT current_user AS who, (${21}::int * 2) AS doubled`;

      expect(row).toEqual({ who: 'pdv_app', doubled: 42 });
    } finally {
      await db.$disconnect();
    }
  });
});
