import { Prisma, type PrismaClient } from '@/generated/prisma/client';
import type { ProductData } from '../domain/product';
import {
  CatalogConflictError,
  type ProductRecord,
  type ProductRepository,
  type ProductSearchQuery,
} from '../application/ports';
import { constraintViolation } from './constraint-errors';

type ProductDb = Pick<PrismaClient, 'product' | '$queryRaw'>;

const NAME_INDEX = 'products_name_normalized_active_key';
const BARCODE_INDEX = 'products_barcode_key';
const CATEGORY_FK = 'products_category_id_fkey';

/** Caractere de escape do LIKE; `!` não aparece em SQL como barra invertida (sem armadilhas de aspas). */
const LIKE_ESCAPE = '!';

/** `%`, `_` e o próprio escape valem como TEXTO no termo digitado, nunca como curinga. */
function escapeLike(term: string): string {
  return term.replace(/[!%_]/g, (char) => `${LIKE_ESCAPE}${char}`);
}

type ProductRow = {
  id: string;
  name: string;
  nameNormalized: string;
  barcode: string | null;
  categoryId: string | null;
  priceCents: number;
  costCents: number | null;
  stockQty: number;
  minStock: number;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  csosn: string | null;
  origin: number | null;
  unit: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(row: ProductRow): ProductRecord {
  return {
    id: row.id,
    name: row.name,
    nameNormalized: row.nameNormalized,
    barcode: row.barcode,
    categoryId: row.categoryId,
    priceCents: row.priceCents,
    costCents: row.costCents,
    stockQty: row.stockQty,
    minStock: row.minStock,
    ncm: row.ncm,
    cest: row.cest,
    cfop: row.cfop,
    csosn: row.csosn,
    origin: row.origin,
    unit: row.unit,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Traduz a restrição violada no código de conflito do catálogo; o resto é bug e sobe como veio. */
function translate(error: unknown): never {
  const violation = constraintViolation(error);
  if (violation?.constraint === NAME_INDEX) throw new CatalogConflictError('PRODUCT_NAME_TAKEN');
  if (violation?.constraint === BARCODE_INDEX) throw new CatalogConflictError('BARCODE_TAKEN');
  if (violation?.constraint === CATEGORY_FK) throw new CatalogConflictError('CATEGORY_NOT_FOUND');
  throw error;
}

const dataFields = (product: ProductData) => ({
  name: product.name,
  nameNormalized: product.nameNormalized,
  barcode: product.barcode,
  categoryId: product.categoryId,
  priceCents: product.priceCents,
  costCents: product.costCents,
  minStock: product.minStock,
  ncm: product.ncm,
  cest: product.cest,
  cfop: product.cfop,
  csosn: product.csosn,
  origin: product.origin,
  unit: product.unit,
});

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly db: ProductDb) {}

  async create(product: ProductData & { id: string; now: Date }): Promise<void> {
    try {
      await this.db.product.create({
        data: {
          id: product.id,
          ...dataFields(product),
          createdAt: product.now,
          updatedAt: product.now,
        },
      });
    } catch (error) {
      translate(error);
    }
  }

  async update(id: string, product: ProductData, now: Date): Promise<void> {
    try {
      await this.db.product.update({
        where: { id },
        data: { ...dataFields(product), updatedAt: now },
      });
    } catch (error) {
      translate(error);
    }
  }

  async findById(id: string): Promise<ProductRecord | null> {
    const row = await this.db.product.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async setArchived(id: string, archivedAt: Date | null, now: Date): Promise<void> {
    try {
      await this.db.product.update({ where: { id }, data: { archivedAt, updatedAt: now } });
    } catch (error) {
      translate(error);
    }
  }

  /**
   * Busca parcial (ADR-020): `LIKE '%termo%'` sobre `name_normalized` (índice trigram) ou código
   * de barras exato. SQL parametrizado: o termo NUNCA é concatenado no texto da consulta.
   * Relevância: código exato, nome que começa com o termo, posição do termo, nome mais curto;
   * `COLLATE "C"` deixa a ordem final igual em qualquer banco.
   */
  async search(query: ProductSearchQuery): Promise<ProductRecord[]> {
    const term = query.normalizedTerm;
    const contains = `%${escapeLike(term)}%`;
    const startsWith = `${escapeLike(term)}%`;
    const rows = await this.db.$queryRaw<ProductRow[]>(Prisma.sql`
      SELECT id, name, name_normalized AS "nameNormalized", barcode, category_id AS "categoryId",
             price_cents AS "priceCents", cost_cents AS "costCents", stock_qty AS "stockQty",
             min_stock AS "minStock", ncm, cest, cfop, csosn, origin, unit,
             archived_at AS "archivedAt", created_at AS "createdAt", updated_at AS "updatedAt"
        FROM products
       WHERE (${query.includeArchived}::boolean OR archived_at IS NULL)
         AND (${term}::text = ''
              OR name_normalized LIKE ${contains}::text ESCAPE '!'
              OR (${query.barcode}::text <> '' AND barcode = ${query.barcode}::text))
       ORDER BY CASE WHEN ${query.barcode}::text <> '' AND barcode = ${query.barcode}::text THEN 0 ELSE 1 END,
                CASE WHEN ${term}::text <> '' AND name_normalized LIKE ${startsWith}::text ESCAPE '!' THEN 0 ELSE 1 END,
                CASE WHEN ${term}::text = '' THEN 0 ELSE strpos(name_normalized, ${term}::text) END,
                CASE WHEN ${term}::text = '' THEN 0 ELSE char_length(name_normalized) END,
                name_normalized COLLATE "C", id
       LIMIT ${query.limit} OFFSET ${query.offset}`);
    return rows.map(toRecord);
  }
}
