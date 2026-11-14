import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createIsolatedDatabase, migrateDeploy, query, type IsolatedDatabase } from '../helpers/db';

type MigrationRow = {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

describe('migrações em banco novo', () => {
  let fresh: IsolatedDatabase;

  beforeAll(async () => {
    fresh = await createIsolatedDatabase();
  });
  afterAll(async () => {
    await fresh.drop();
  });

  it('[RNF-INT-05] aplicam do zero, todas concluídas e nenhuma revertida', async () => {
    await migrateDeploy(fresh.ownerUrl);

    const rows = await query<MigrationRow>(
      fresh.ownerUrl,
      'SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations',
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.finished_at, `${row.migration_name} concluída`).not.toBeNull();
      expect(row.rolled_back_at, `${row.migration_name} revertida`).toBeNull();
    }
  }, 60_000);
});

describe('migrações já aplicadas', () => {
  let db: IsolatedDatabase;

  beforeAll(async () => {
    db = await createIsolatedDatabase({ migrate: true });
  }, 60_000);
  afterAll(async () => {
    await db.drop();
  });

  it('[RNF-INT-05] reaplicar é seguro: nada pendente e nenhuma linha nova', async () => {
    const before = await query(db.ownerUrl, 'SELECT 1 FROM _prisma_migrations');

    await migrateDeploy(db.ownerUrl);

    const after = await query(db.ownerUrl, 'SELECT 1 FROM _prisma_migrations');
    expect(after).toHaveLength(before.length);
  }, 60_000);

  it('[ADR-020] criam as extensões unaccent e pg_trgm', async () => {
    const rows = await query<{ extname: string }>(
      db.ownerUrl,
      "SELECT extname FROM pg_extension WHERE extname IN ('unaccent', 'pg_trgm') ORDER BY extname",
    );

    expect(rows.map((row) => row.extname)).toEqual(['pg_trgm', 'unaccent']);
  });
});
