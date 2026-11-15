import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { PrismaAuditLog, type AuditLog } from '@/modules/audit';
import type { UnitOfWork, UnitOfWorkContext } from '../application/ports';
import { PrismaSessionRepository } from './prisma-session-repository';
import { PrismaUserRepository } from './prisma-user-repository';

export type PrismaUnitOfWorkOptions = {
  /** Troca a gravação de auditoria (só para testes de atomicidade). */
  createAudit?: (tx: Prisma.TransactionClient) => AuditLog;
};

/** Abre uma transação do Prisma e entrega repositórios e auditoria ligados a ela. */
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(
    private readonly db: PrismaClient,
    private readonly options: PrismaUnitOfWorkOptions = {},
  ) {}

  run<T>(work: (context: UnitOfWorkContext) => Promise<T>): Promise<T> {
    return this.db.$transaction((tx) =>
      work({
        users: new PrismaUserRepository(tx),
        sessions: new PrismaSessionRepository(tx),
        audit: (this.options.createAudit ?? ((client) => new PrismaAuditLog(client)))(tx),
      }),
    );
  }
}
