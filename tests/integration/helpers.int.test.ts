import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createIsolatedDatabase, query, truncateAll, type IsolatedDatabase } from '../helpers/db';

describe('helper truncateAll', () => {
  let db: IsolatedDatabase;

  beforeAll(async () => {
    db = await createIsolatedDatabase({ migrate: true });
  }, 60_000);
  afterAll(async () => {
    await db.drop();
  });

  it('[07 §4] esvazia todas as tabelas, menos o histórico de migrações', async () => {
    await query(db.ownerUrl, 'CREATE TABLE scratch_a (id int)');
    await query(db.ownerUrl, 'CREATE TABLE scratch_b (id int)');
    await query(db.ownerUrl, 'INSERT INTO scratch_a VALUES (1), (2)');
    await query(db.ownerUrl, 'INSERT INTO scratch_b VALUES (3)');
    const migrationsBefore = await query(db.ownerUrl, 'SELECT 1 FROM _prisma_migrations');

    await truncateAll(db.ownerUrl);

    expect(await query(db.ownerUrl, 'SELECT 1 FROM scratch_a')).toHaveLength(0);
    expect(await query(db.ownerUrl, 'SELECT 1 FROM scratch_b')).toHaveLength(0);
    expect(await query(db.ownerUrl, 'SELECT 1 FROM _prisma_migrations')).toHaveLength(
      migrationsBefore.length,
    );
  });
});
