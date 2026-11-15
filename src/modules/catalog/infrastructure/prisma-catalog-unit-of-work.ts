import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { PrismaAuditLog, type AuditLog } from '@/modules/audit';
import type { CatalogUnitOfWork, CatalogUnitOfWorkContext } from '../application/ports';
import { PrismaCategoryRepository } from './prisma-category-repository';
import { PrismaProductRepository } from './prisma-product-repository';

export type PrismaCatalogUnitOfWorkOptions = {
  /** Troca a gravação de auditoria (só para testes de atomicidade). */
  createAudit?: (tx: Prisma.TransactionClient) => AuditLog;
};

/** Abre uma transação do Prisma e entrega repositórios e auditoria ligados a ela. */
export class PrismaCatalogUnitOfWork implements CatalogUnitOfWork {
  constructor(
    private readonly db: PrismaClient,
    private readonly options: PrismaCatalogUnitOfWorkOptions = {},
  ) {}

  run<T>(work: (context: CatalogUnitOfWorkContext) => Promise<T>): Promise<T> {
    return this.db.$transaction((tx) =>
      work({
        categories: new PrismaCategoryRepository(tx),
        products: new PrismaProductRepository(tx),
        audit: (this.options.createAudit ?? ((client) => new PrismaAuditLog(client)))(tx),
      }),
    );
  }
}
