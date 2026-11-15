import type { PrismaClient } from '@/generated/prisma/client';
import {
  CatalogConflictError,
  type CategoryRecord,
  type CategoryRepository,
} from '../application/ports';
import { constraintViolation } from './constraint-errors';

type CategoryDb = Pick<PrismaClient, 'category'>;

const NAME_INDEX = 'categories_name_normalized_key';
const PRODUCT_CATEGORY_FK = 'products_category_id_fkey';

function toRecord(row: CategoryRecord | null): CategoryRecord | null {
  return row
    ? {
        id: row.id,
        name: row.name,
        nameNormalized: row.nameNormalized,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }
    : null;
}

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly db: CategoryDb) {}

  async create(category: {
    id: string;
    name: string;
    nameNormalized: string;
    now: Date;
  }): Promise<void> {
    try {
      await this.db.category.create({
        data: {
          id: category.id,
          name: category.name,
          nameNormalized: category.nameNormalized,
          createdAt: category.now,
          updatedAt: category.now,
        },
      });
    } catch (error) {
      if (constraintViolation(error)?.constraint === NAME_INDEX) {
        throw new CatalogConflictError('CATEGORY_NAME_TAKEN');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<CategoryRecord | null> {
    return toRecord(await this.db.category.findUnique({ where: { id } }));
  }

  async rename(
    id: string,
    name: { name: string; nameNormalized: string },
    now: Date,
  ): Promise<void> {
    try {
      await this.db.category.update({
        where: { id },
        data: { name: name.name, nameNormalized: name.nameNormalized, updatedAt: now },
      });
    } catch (error) {
      if (constraintViolation(error)?.constraint === NAME_INDEX) {
        throw new CatalogConflictError('CATEGORY_NAME_TAKEN');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.category.delete({ where: { id } });
    } catch (error) {
      if (constraintViolation(error)?.constraint === PRODUCT_CATEGORY_FK) {
        throw new CatalogConflictError('CATEGORY_NOT_EMPTY');
      }
      throw error;
    }
  }

  async list(): Promise<CategoryRecord[]> {
    const rows = await this.db.category.findMany({
      orderBy: [{ nameNormalized: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => toRecord(row)!);
  }
}
