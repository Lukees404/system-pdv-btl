import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { getEnv } from './env';

// Poucas conexões por instância: em serverless cada instância abre as suas, e o
// pooler do provedor tem limite (ADR-005).
const POOL_MAX = 5;

/** Cria um cliente Prisma sobre o driver `pg`. Quem cria é dono e deve chamar `$disconnect()`. */
export function createDb(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: POOL_MAX }) });
}

// Uma instância por processo; em `next dev` o hot reload reexecuta o módulo e criaria
// um cliente novo a cada edição, por isso guardamos em globalThis.
const globalForDb = globalThis as typeof globalThis & { __pdvDb?: PrismaClient };

/** Cliente da aplicação (usuário `pdv_app`, via DATABASE_URL). */
export function getDb(): PrismaClient {
  globalForDb.__pdvDb ??= createDb(getEnv().DATABASE_URL);
  return globalForDb.__pdvDb;
}
