import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import type { AuditLog } from '../application/ports';
import type { AuditEntry } from '../domain/audit-entry';

/** Aceita o cliente normal ou o `tx` de uma transação interativa do Prisma. */
type AuditDb = Pick<PrismaClient, 'auditLog'>;

export class PrismaAuditLog implements AuditLog {
  constructor(private readonly db: AuditDb) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.db.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        data: entry.data as Prisma.InputJsonObject,
        createdAt: entry.createdAt,
      },
    });
  }
}
