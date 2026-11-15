import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '@/lib/db';
import { FakeClock } from '@/shared/clock';
import { createIsolatedDatabase, query, type IsolatedDatabase } from '../../../../tests/helpers/db';
import { buildAuditEntry } from '../domain/audit-entry';
import { PrismaAuditLog } from './prisma-audit-log';

const clock = new FakeClock(new Date('2026-03-10T15:00:00.000Z'));

describe('PrismaAuditLog (banco real)', () => {
  let database: IsolatedDatabase;
  let userId: string;

  beforeAll(async () => {
    database = await createIsolatedDatabase({ migrate: true });
    const [user] = await query<{ id: string }>(
      database.ownerUrl,
      `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Teste', 'audit@exemplo.test', 'hash', now(), now()) RETURNING id`,
    );
    userId = user!.id;
  }, 90_000);
  afterAll(async () => {
    await database.drop();
  });

  const countByEntity = async (entityId: string) =>
    (await query(database.ownerUrl, 'SELECT 1 FROM audit_log WHERE entity_id = $1', [entityId]))
      .length;

  it('[RN-ACE-02] grava todos os campos como pdv_app, com o horário da entrada', async () => {
    const db = createDb(database.appUrl);
    try {
      await new PrismaAuditLog(db).record(
        buildAuditEntry(
          {
            userId,
            action: 'user.created',
            entityType: 'user',
            entityId: 'entidade-completa',
            data: { role: 'OWNER', n: 2 },
          },
          clock,
        ),
      );
    } finally {
      await db.$disconnect();
    }

    const [row] = await query<{
      user_id: string;
      action: string;
      entity_type: string;
      data: unknown;
      created_at: Date;
    }>(
      database.ownerUrl,
      "SELECT user_id, action, entity_type, data, created_at FROM audit_log WHERE entity_id = 'entidade-completa'",
    );
    expect(row).toMatchObject({
      user_id: userId,
      action: 'user.created',
      entity_type: 'user',
      data: { role: 'OWNER', n: 2 },
    });
    expect(row?.created_at.toISOString()).toBe('2026-03-10T15:00:00.000Z');
  });

  it('[RN-ACE-02] aceita ação do sistema (user_id nulo)', async () => {
    const db = createDb(database.appUrl);
    try {
      await new PrismaAuditLog(db).record(
        buildAuditEntry(
          { userId: null, action: 'user.created', entityType: 'user', entityId: 'sem-usuario' },
          clock,
        ),
      );
    } finally {
      await db.$disconnect();
    }

    expect(await countByEntity('sem-usuario')).toBe(1);
  });

  it('[RN-ACE-02] dentro de uma transação, a auditoria é gravada junto com o commit', async () => {
    const db = createDb(database.appUrl);
    try {
      await db.$transaction(async (tx) => {
        await new PrismaAuditLog(tx).record(
          buildAuditEntry(
            { userId, action: 'user.created', entityType: 'user', entityId: 'tx-commit' },
            clock,
          ),
        );
      });
    } finally {
      await db.$disconnect();
    }

    expect(await countByEntity('tx-commit')).toBe(1);
  });

  it('[RN-ACE-02] se a transação falha, a auditoria some junto (nenhum registro órfão)', async () => {
    const db = createDb(database.appUrl);
    try {
      await expect(
        db.$transaction(async (tx) => {
          await new PrismaAuditLog(tx).record(
            buildAuditEntry(
              { userId, action: 'user.created', entityType: 'user', entityId: 'tx-rollback' },
              clock,
            ),
          );
          throw new Error('falha depois de auditar');
        }),
      ).rejects.toThrow('falha depois de auditar');
    } finally {
      await db.$disconnect();
    }

    expect(await countByEntity('tx-rollback')).toBe(0);
  });
});
