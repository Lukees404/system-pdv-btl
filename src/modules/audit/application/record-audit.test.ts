import { describe, expect, it } from 'vitest';
import { FakeClock } from '@/shared/clock';
import { InMemoryAuditLog } from '../infrastructure/in-memory-audit-log';
import { recordAudit } from './record-audit';

const clock = new FakeClock(new Date('2026-03-10T15:00:00.000Z'));

describe('recordAudit', () => {
  it('[RN-ACE-02] grava uma entrada com o horário do Clock', async () => {
    const log = new InMemoryAuditLog();

    await recordAudit(
      { log, clock },
      { userId: 'u1', action: 'user.created', entityType: 'user', entityId: 'u2' },
    );

    expect(log.entries).toEqual([
      {
        userId: 'u1',
        action: 'user.created',
        entityType: 'user',
        entityId: 'u2',
        data: {},
        createdAt: new Date('2026-03-10T15:00:00.000Z'),
      },
    ]);
  });

  it('[RN-ACE-03] com dado pessoal rejeita e NÃO grava nada', async () => {
    const log = new InMemoryAuditLog();

    await expect(
      recordAudit(
        { log, clock },
        { userId: 'u1', action: 'user.created', entityType: 'user', data: { email: 'a@b.com' } },
      ),
    ).rejects.toMatchObject({ code: 'AUDIT_PII_FORBIDDEN' });
    expect(log.entries).toHaveLength(0);
  });

  it('[RN-ACE-02] o fake em memória guarda cópias: alterar o original depois não muda o registro', async () => {
    const log = new InMemoryAuditLog();
    const data = { productId: 'p1' };

    await recordAudit({ log, clock }, { userId: 'u1', action: 'user.created', entityType: 'user', data });
    data.productId = 'alterado';

    expect(log.entries[0]?.data).toEqual({ productId: 'p1' });
  });
});
