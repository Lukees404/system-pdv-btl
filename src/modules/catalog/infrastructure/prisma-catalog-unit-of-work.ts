import type { PrismaClient } from '@/generated/prisma/client';
import { PrismaAuditLog } from '@/modules/audit';
import type { CatalogUnitOfWork, CatalogUnitOfWorkContext } from '../application/ports';
import { PrismaCategoryRepository } from './prisma-category-repository';

/** Abre uma transação do Prisma e entrega repositórios e auditoria ligados a ela. */
export class PrismaCatalogUnitOfWork implements CatalogUnitOfWork {
  constructor(private readonly db: PrismaClient) {}

  run<T>(work: (context: CatalogUnitOfWorkContext) => Promise<T>): Promise<T> {
    return this.db.$transaction((tx) =>
      work({
        categories: new PrismaCategoryRepository(tx),
        audit: new PrismaAuditLog(tx),
      }),
    );
  }
}
