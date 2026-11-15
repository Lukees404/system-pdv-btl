import type { PrismaClient } from '@/generated/prisma/client';
import type { ServiceData } from '../domain/service';
import {
  CatalogConflictError,
  type ServiceRecord,
  type ServiceRepository,
  type ServiceUpdate,
} from '../application/ports';
import { constraintViolation } from './constraint-errors';

type ServiceDb = Pick<PrismaClient, 'service'>;

const NAME_INDEX = 'services_name_normalized_active_key';
const FEE_INDEX = 'services_single_displacement_fee_key';

function toRecord(row: ServiceRecord): ServiceRecord {
  return {
    id: row.id,
    name: row.name,
    nameNormalized: row.nameNormalized,
    priceCents: row.priceCents,
    isDisplacementFee: row.isDisplacementFee,
    fiscalServiceCode: row.fiscalServiceCode,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Traduz a restrição violada no código de conflito do catálogo; o resto é bug e sobe como veio. */
function translate(error: unknown): never {
  const violation = constraintViolation(error);
  if (violation?.constraint === NAME_INDEX) throw new CatalogConflictError('SERVICE_NAME_TAKEN');
  if (violation?.constraint === FEE_INDEX) {
    throw new CatalogConflictError('DISPLACEMENT_FEE_EXISTS');
  }
  throw error;
}

export class PrismaServiceRepository implements ServiceRepository {
  constructor(private readonly db: ServiceDb) {}

  async create(service: ServiceData & { id: string; now: Date }): Promise<void> {
    try {
      await this.db.service.create({
        data: {
          id: service.id,
          name: service.name,
          nameNormalized: service.nameNormalized,
          priceCents: service.priceCents,
          isDisplacementFee: service.isDisplacementFee,
          fiscalServiceCode: service.fiscalServiceCode,
          createdAt: service.now,
          updatedAt: service.now,
        },
      });
    } catch (error) {
      translate(error);
    }
  }

  async update(id: string, service: ServiceUpdate, now: Date): Promise<void> {
    try {
      await this.db.service.update({
        where: { id },
        data: {
          name: service.name,
          nameNormalized: service.nameNormalized,
          priceCents: service.priceCents,
          fiscalServiceCode: service.fiscalServiceCode,
          updatedAt: now,
        },
      });
    } catch (error) {
      translate(error);
    }
  }

  async findById(id: string): Promise<ServiceRecord | null> {
    const row = await this.db.service.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async setArchived(id: string, archivedAt: Date | null, now: Date): Promise<void> {
    try {
      await this.db.service.update({ where: { id }, data: { archivedAt, updatedAt: now } });
    } catch (error) {
      translate(error);
    }
  }

  async list(options: { includeArchived: boolean }): Promise<ServiceRecord[]> {
    const rows = await this.db.service.findMany({
      where: options.includeArchived ? {} : { archivedAt: null },
      orderBy: [{ nameNormalized: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toRecord);
  }
}
