import type { PrismaClient } from '@/generated/prisma/client';
import {
  DuplicateEmailError,
  type NewUser,
  type UserRecord,
  type UserRepository,
} from '../application/ports';

type UserDb = Pick<PrismaClient, 'user'>;

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: UserDb) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.db.user.findUnique({ where: { email } });
    return row
      ? {
          id: row.id,
          name: row.name,
          email: row.email,
          passwordHash: row.passwordHash,
          role: row.role,
          active: row.active,
          failedAttempts: row.failedAttempts,
          lockedUntil: row.lockedUntil,
        }
      : null;
  }

  async create(user: NewUser): Promise<void> {
    try {
      await this.db.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          role: 'OWNER',
          active: true,
          createdAt: user.createdAt,
          updatedAt: user.createdAt,
        },
      });
    } catch (error) {
      // P2002 = violação de índice único. Aqui o único possível é o e-mail (o id é nosso).
      if ((error as { code?: string }).code === 'P2002') throw new DuplicateEmailError();
      throw error;
    }
  }
}
