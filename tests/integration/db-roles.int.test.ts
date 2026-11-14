import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createIsolatedDatabase, query, type IsolatedDatabase } from '../helpers/db';

// Privilégio mínimo (RNF-SEG-07): o usuário da aplicação só faz DML.
describe('papel pdv_app', () => {
  let db: IsolatedDatabase;

  beforeAll(async () => {
    db = await createIsolatedDatabase({ migrate: true });
  }, 60_000);
  afterAll(async () => {
    await db.drop();
  });

  it('[RNF-SEG-07] conecta com o próprio usuário, sem ser superusuário nem criar bancos', async () => {
    const [who] = await query<{ current_user: string }>(db.appUrl, 'SELECT current_user');
    const [role] = await query<{ rolsuper: boolean; rolcreatedb: boolean; rolcreaterole: boolean }>(
      db.ownerUrl,
      "SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = 'pdv_app'",
    );

    expect(who?.current_user).toBe('pdv_app');
    expect(role).toEqual({ rolsuper: false, rolcreatedb: false, rolcreaterole: false });
  });

  it('[RNF-SEG-07] não consegue criar tabelas', async () => {
    await expect(query(db.appUrl, 'CREATE TABLE app_created (id int)')).rejects.toMatchObject({
      code: '42501', // insufficient_privilege
    });
  });

  it('[RNF-SEG-07] não consegue apagar nem alterar tabelas do dono', async () => {
    await query(db.ownerUrl, 'CREATE TABLE owner_table_ddl (id int)');

    await expect(query(db.appUrl, 'DROP TABLE owner_table_ddl')).rejects.toMatchObject({
      code: '42501',
    });
    await expect(
      query(db.appUrl, 'ALTER TABLE owner_table_ddl ADD COLUMN extra int'),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('[RNF-SEG-07] tem SELECT/INSERT/UPDATE/DELETE em tabelas criadas depois pelo dono', async () => {
    await query(db.ownerUrl, 'CREATE TABLE owner_table_dml (id int primary key, label text)');

    await query(db.appUrl, "INSERT INTO owner_table_dml VALUES (1, 'a')");
    await query(db.appUrl, "UPDATE owner_table_dml SET label = 'b' WHERE id = 1");
    const rows = await query<{ label: string }>(db.appUrl, 'SELECT label FROM owner_table_dml');
    await query(db.appUrl, 'DELETE FROM owner_table_dml WHERE id = 1');

    expect(rows).toEqual([{ label: 'b' }]);
  });

  it('[RNF-SEG-07] não consegue TRUNCATE (só DML linha a linha)', async () => {
    await query(db.ownerUrl, 'CREATE TABLE owner_table_truncate (id int)');

    await expect(query(db.appUrl, 'TRUNCATE owner_table_truncate')).rejects.toMatchObject({
      code: '42501',
    });
  });
});
