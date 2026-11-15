import type { AuditLog } from '@/modules/audit';
import type { ErrorCode } from '@/shared/errors';

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

/** Repositórios e auditoria ligados à MESMA transação do banco. */
export type CatalogUnitOfWorkContext = {
  categories: CategoryRepository;
  audit: AuditLog;
};

export interface CatalogUnitOfWork {
  /** Roda `work` numa transação: tudo é gravado junto (commit) ou nada (se `work` lançar). */
  run<T>(work: (context: CatalogUnitOfWorkContext) => Promise<T>): Promise<T>;
}
