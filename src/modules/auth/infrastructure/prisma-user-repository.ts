import type { PrismaClient } from '@/generated/prisma/client';
import {
  DuplicateEmailError,
  type NewUser,
  type UserRecord,
  type UserRepository,
} from '../application/ports';

type UserDb = Pick<PrismaClient, 'user' | '$executeRaw'>;

type UserRow = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  active: boolean;
  failedAttempts: number;
  lockedUntil: Date | null;
};

function toRecord(row: UserRow | null): UserRecord | null {
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

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: UserDb) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    return toRecord(await this.db.user.findUnique({ where: { email } }));
  }

  async findById(id: string): Promise<UserRecord | null> {
    return toRecord(await this.db.user.findUnique({ where: { id } }));
  }

  async registerFailure(userId: string, now: Date): Promise<number> {
    // `increment` vira `SET failed_attempts = failed_attempts + 1 ... RETURNING`: atômico.
    const row = await this.db.user.update({
      where: { id: userId },
      data: { failedAttempts: { increment: 1 }, updatedAt: now },
      select: { failedAttempts: true },
    });
    return row.failedAttempts;
  }

  async lockUntil(userId: string, until: Date, now: Date): Promise<void> {
    // GREATEST: se duas falhas simultâneas calculam bloqueios diferentes, o MAIOR vence,
    // independente da ordem em que as gravações chegam ao banco.
    await this.db.$executeRaw`
      UPDATE users
         SET locked_until = GREATEST(COALESCE(locked_until, ${until}::timestamptz), ${until}::timestamptz),
             updated_at = ${now}::timestamptz
       WHERE id = ${userId}::uuid`;
  }

  async updatePasswordHash(userId: string, passwordHash: string, now: Date): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { passwordHash, updatedAt: now } });
  }

  async resetFailures(userId: string, now: Date): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { failedAttempts: 0, lockedUntil: null, updatedAt: now },
    });
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
