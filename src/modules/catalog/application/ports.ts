import type { AuditLog } from '@/modules/audit';
import type { ErrorCode } from '@/shared/errors';
import type { ProductData } from '../domain/product';
import type { ServiceData } from '../domain/service';

export type CategoryRecord = {
  id: string;
  name: string;
  nameNormalized: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Conflito que SÓ o banco decide de forma segura (índice único, chave estrangeira): o repositório
 * traduz o erro do banco para esta exceção e o caso de uso a vira em `Result` com o código
 * estável. Assim não há "consulta antes de gravar" sujeita a corrida (RN-CAT-02/03, RN-SER-03).
 */
export type CatalogConflictKind = Extract<
  ErrorCode,
  | 'CATEGORY_NAME_TAKEN'
  | 'CATEGORY_NOT_EMPTY'
  | 'CATEGORY_NOT_FOUND'
  | 'PRODUCT_NAME_TAKEN'
  | 'BARCODE_TAKEN'
  | 'SERVICE_NAME_TAKEN'
  | 'DISPLACEMENT_FEE_EXISTS'
>;

export class CatalogConflictError extends Error {
  constructor(readonly kind: CatalogConflictKind) {
    super(kind);
    this.name = 'CatalogConflictError';
  }
}

export interface CategoryRepository {
  /** Lança `CatalogConflictError('CATEGORY_NAME_TAKEN')` se o nome normalizado já existir. */
  create(category: { id: string; name: string; nameNormalized: string; now: Date }): Promise<void>;
  findById(id: string): Promise<CategoryRecord | null>;
  /** Lança `CATEGORY_NAME_TAKEN` se outro registro já tiver o nome normalizado. */
  rename(id: string, name: { name: string; nameNormalized: string }, now: Date): Promise<void>;
  /** Lança `CATEGORY_NOT_EMPTY` se houver produto ligado (FK RESTRICT). */
  delete(id: string): Promise<void>;
  list(): Promise<CategoryRecord[]>;
}

/** `stockQty` é cache do livro de estoque (M3): o catálogo só lê, nunca escreve (ADR-007). */
export type ProductRecord = ProductData & {
  id: string;
  stockQty: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductSearchQuery = {
  /** Texto já normalizado (`normalizeText`); vazio = listar tudo. */
  normalizedTerm: string;
  /** Texto original aparado, para comparar com o código de barras. */
  barcode: string;
  includeArchived: boolean;
  limit: number;
  offset: number;
};

export interface ProductRepository {
  /** Lança `PRODUCT_NAME_TAKEN`, `BARCODE_TAKEN` ou `CATEGORY_NOT_FOUND` (restrições do banco). */
  create(product: ProductData & { id: string; now: Date }): Promise<void>;
  /** Mesmos conflitos do `create`. NÃO toca em `stock_qty`, `archived_at` nem `created_at`. */
  update(id: string, product: ProductData, now: Date): Promise<void>;
  findById(id: string): Promise<ProductRecord | null>;
  /** `null` reativa; reativar com nome já tomado por outro ativo lança `PRODUCT_NAME_TAKEN`. */
  setArchived(id: string, archivedAt: Date | null, now: Date): Promise<void>;
  search(query: ProductSearchQuery): Promise<ProductRecord[]>;
}

export type ServiceRecord = ServiceData & {
  id: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Campos editáveis: a marca de taxa de deslocamento NÃO muda depois de criada (RN-SER-03). */
export type ServiceUpdate = Pick<
  ServiceData,
  'name' | 'nameNormalized' | 'priceCents' | 'fiscalServiceCode'
>;

export interface ServiceRepository {
  /** Lança `SERVICE_NAME_TAKEN` ou `DISPLACEMENT_FEE_EXISTS` (restrições do banco). */
  create(service: ServiceData & { id: string; now: Date }): Promise<void>;
  /** Lança `SERVICE_NAME_TAKEN` se outro serviço ativo já tiver o nome normalizado. */
  update(id: string, service: ServiceUpdate, now: Date): Promise<void>;
  findById(id: string): Promise<ServiceRecord | null>;
  /** `null` reativa; reativar com nome já tomado por outro ativo lança `SERVICE_NAME_TAKEN`. */
  setArchived(id: string, archivedAt: Date | null, now: Date): Promise<void>;
  list(options: { includeArchived: boolean }): Promise<ServiceRecord[]>;
}

/** Repositórios e auditoria ligados à MESMA transação do banco. */
export type CatalogUnitOfWorkContext = {
  categories: CategoryRepository;
  products: ProductRepository;
  services: ServiceRepository;
  audit: AuditLog;
};

export interface CatalogUnitOfWork {
  /** Roda `work` numa transação: tudo é gravado junto (commit) ou nada (se `work` lançar). */
  run<T>(work: (context: CatalogUnitOfWorkContext) => Promise<T>): Promise<T>;
}
