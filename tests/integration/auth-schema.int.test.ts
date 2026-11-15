import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createIsolatedDatabase, query, type IsolatedDatabase } from '../helpers/db';

// Invariantes de usuários, sessões e auditoria garantidas NO BANCO (RNF-INT-02), não só no código.
describe('esquema de autenticação e auditoria', () => {
  let db: IsolatedDatabase;

  beforeAll(async () => {
    db = await createIsolatedDatabase({ migrate: true });
  }, 90_000);
  afterAll(async () => {
    await db.drop();
  });

  const insertUser = (email: string, overrides: { role?: string; failed?: number } = {}) =>
    query<{ id: string }>(
      db.ownerUrl,
      `INSERT INTO users (id, name, email, password_hash, role, failed_attempts, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Teste', $1, 'hash', $2, $3, now(), now()) RETURNING id`,
      [email, overrides.role ?? 'OWNER', overrides.failed ?? 0],
    );

  const insertSession = (
    userId: string,
    tokenHash: string,
    expiresSql = "now() + interval '30 days'",
  ) =>
    query(
      db.ownerUrl,
      `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
       VALUES (gen_random_uuid(), $1, $2, now(), ${expiresSql})`,
      [userId, tokenHash],
    );

  describe('users', () => {
    it('[RN-ACE-01] aceita o papel OWNER e rejeita qualquer outro', async () => {
      await expect(insertUser('owner@exemplo.test')).resolves.toHaveLength(1);

      await expect(insertUser('admin@exemplo.test', { role: 'ADMIN' })).rejects.toMatchObject({
        code: '23514', // check_violation
      });
    });

    it('[RN-ACE-01] e-mail é único', async () => {
      await insertUser('unico@exemplo.test');

      await expect(insertUser('unico@exemplo.test')).rejects.toMatchObject({ code: '23505' });
    });

    it('[RN-ACE-01] o banco rejeita e-mail não normalizado (maiúsculas ou espaços nas pontas)', async () => {
      await expect(insertUser('Maiuscula@Exemplo.test')).rejects.toMatchObject({ code: '23514' });
      await expect(insertUser(' espaco@exemplo.test ')).rejects.toMatchObject({ code: '23514' });
    });

    it('[RN-ACE-05] failed_attempts não pode ser negativo; padrão 0 e usuário ativo', async () => {
      await expect(insertUser('negativo@exemplo.test', { failed: -1 })).rejects.toMatchObject({
        code: '23514',
      });

      await query(
        db.ownerUrl,
        `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
         VALUES (gen_random_uuid(), 'Padrao', 'padrao@exemplo.test', 'hash', now(), now())`,
      );
      const [row] = await query<{
        failed_attempts: number;
        active: boolean;
        locked_until: Date | null;
        role: string;
      }>(
        db.ownerUrl,
        "SELECT failed_attempts, active, locked_until, role FROM users WHERE email = 'padrao@exemplo.test'",
      );
      expect(row).toEqual({ failed_attempts: 0, active: true, locked_until: null, role: 'OWNER' });
    });

    it('[RNF-SEG-07] a aplicação (pdv_app) faz INSERT, SELECT e UPDATE em users', async () => {
      await query(
        db.appUrl,
        `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
         VALUES (gen_random_uuid(), 'App', 'app@exemplo.test', 'hash', now(), now())`,
      );

      await query(
        db.appUrl,
        "UPDATE users SET failed_attempts = failed_attempts + 1 WHERE email = 'app@exemplo.test'",
      );
      const [row] = await query<{ failed_attempts: number }>(
        db.appUrl,
        "SELECT failed_attempts FROM users WHERE email = 'app@exemplo.test'",
      );
      expect(row?.failed_attempts).toBe(1);
    });
  });

  describe('sessions', () => {
    it('[RN-ACE-04] token_hash é único', async () => {
      const [user] = await insertUser('sessao-unica@exemplo.test');
      await insertSession(user!.id, 'hash-repetido');

      await expect(insertSession(user!.id, 'hash-repetido')).rejects.toMatchObject({
        code: '23505',
      });
    });

    it('[RN-ACE-04] a sessão exige um usuário existente', async () => {
      await expect(
        insertSession('00000000-0000-4000-8000-00000000dead', 'hash-orfao'),
      ).rejects.toMatchObject({ code: '23503' });
    });

    it('[RN-ACE-04] expires_at precisa ser posterior a created_at', async () => {
      const [user] = await insertUser('expira@exemplo.test');

      await expect(
        insertSession(user!.id, 'hash-expirado', "now() - interval '1 day'"),
      ).rejects.toMatchObject({
        code: '23514',
      });
    });

    it('[RN-ACE-04] um usuário com sessões não pode ser apagado (RESTRICT)', async () => {
      const [user] = await insertUser('restrito@exemplo.test');
      await insertSession(user!.id, 'hash-restrito');

      await expect(
        query(db.ownerUrl, 'DELETE FROM users WHERE id = $1', [user!.id]),
      ).rejects.toMatchObject({
        code: '23503',
      });
    });

    it('[RNF-SEG-07] a aplicação cria e apaga sessões (login e logout)', async () => {
      const [user] = await insertUser('logout@exemplo.test');

      await query(
        db.appUrl,
        `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
         VALUES (gen_random_uuid(), $1, 'hash-app', now(), now() + interval '30 days')`,
        [user!.id],
      );
      await query(db.appUrl, "DELETE FROM sessions WHERE token_hash = 'hash-app'");

      expect(
        await query(db.ownerUrl, "SELECT 1 FROM sessions WHERE token_hash = 'hash-app'"),
      ).toHaveLength(0);
    });

    it('[RNF-INT-02] existe índice por user_id (apagar sessões de um usuário é frequente)', async () => {
      const rows = await query<{ indexdef: string }>(
        db.ownerUrl,
        "SELECT indexdef FROM pg_indexes WHERE tablename = 'sessions' AND indexdef ILIKE '%(user_id)%'",
      );

      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe('audit_log', () => {
    const appInsert = (data = '{}') =>
      query<{ id: string }>(
        db.appUrl,
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, data, created_at)
         VALUES (NULL, 'user.created', 'user', 'abc', $1::jsonb, now()) RETURNING id::text AS id`,
        [data],
      );

    it('[RN-ACE-03][RNF-SEG-07] a aplicação insere e lê, mas NÃO consegue UPDATE, DELETE nem TRUNCATE', async () => {
      const [row] = await appInsert();
      const rows = await query(db.appUrl, 'SELECT 1 FROM audit_log WHERE id = $1::bigint', [
        row!.id,
      ]);
      expect(rows).toHaveLength(1);

      await expect(query(db.appUrl, "UPDATE audit_log SET action = 'x'")).rejects.toMatchObject({
        code: '42501',
      });
      await expect(query(db.appUrl, 'DELETE FROM audit_log')).rejects.toMatchObject({
        code: '42501',
      });
      await expect(query(db.appUrl, 'TRUNCATE audit_log')).rejects.toMatchObject({ code: '42501' });
    });

    it('[RN-ACE-03] data precisa ser um objeto JSON (padrão {})', async () => {
      await expect(appInsert('[]')).rejects.toMatchObject({ code: '23514' });
      await expect(appInsert('"texto"')).rejects.toMatchObject({ code: '23514' });

      await query(
        db.appUrl,
        `INSERT INTO audit_log (action, entity_type, created_at) VALUES ('user.created', 'user', now())`,
      );
      const [row] = await query<{ data: unknown }>(
        db.ownerUrl,
        'SELECT data FROM audit_log WHERE entity_id IS NULL ORDER BY id DESC LIMIT 1',
      );
      expect(row?.data).toEqual({});
    });

    it('[RN-ACE-02] o id é sequencial e a aplicação consegue usar a sequência', async () => {
      const [first] = await appInsert();
      const [second] = await appInsert();

      expect(Number(second!.id)).toBeGreaterThan(Number(first!.id));
    });

    it('[RN-ACE-02] user_id é opcional (ação do sistema) e, se informado, precisa existir', async () => {
      await expect(
        query(
          db.appUrl,
          `INSERT INTO audit_log (user_id, action, entity_type, created_at)
           VALUES ('00000000-0000-4000-8000-00000000dead', 'user.created', 'user', now())`,
        ),
      ).rejects.toMatchObject({ code: '23503' });
    });

    it('[RNF-INT-02] existem os índices (entity_type, entity_id) e (created_at)', async () => {
      const rows = await query<{ indexdef: string }>(
        db.ownerUrl,
        "SELECT indexdef FROM pg_indexes WHERE tablename = 'audit_log'",
      );
      const defs = rows.map((row) => row.indexdef).join('\n');

      expect(defs).toMatch(/\(entity_type, entity_id\)/);
      expect(defs).toMatch(/\(created_at\)/);
    });
  });
});
