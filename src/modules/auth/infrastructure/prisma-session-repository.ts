import type { PrismaClient } from '@/generated/prisma/client';
import type { NewSession, SessionRecord, SessionRepository } from '../application/ports';

type SessionDb = Pick<PrismaClient, 'session'>;

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly db: SessionDb) {}

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const row = await this.db.session.findUnique({ where: { tokenHash } });
    return row ? { id: row.id, userId: row.userId, expiresAt: row.expiresAt } : null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    // deleteMany não falha quando não há nada para apagar (idempotente).
    await this.db.session.deleteMany({ where: { tokenHash } });
  }

  async deleteOthers(userId: string, keepTokenHash: string): Promise<void> {
    await this.db.session.deleteMany({ where: { userId, tokenHash: { not: keepTokenHash } } });
  }

  async create(session: NewSession): Promise<void> {
    await this.db.session.create({
      data: {
        id: session.id,
        userId: session.userId,
        tokenHash: session.tokenHash,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
    });
  }
}
