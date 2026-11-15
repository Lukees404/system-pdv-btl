import type { PrismaClient } from '@/generated/prisma/client';
import type { NewSession, SessionRepository } from '../application/ports';

type SessionDb = Pick<PrismaClient, 'session'>;

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly db: SessionDb) {}

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
