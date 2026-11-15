import type { Clock } from '@/shared/clock';
import { DomainError } from '@/shared/errors';
import type { IdGenerator } from '@/shared/ids';
import { err, type Result } from '@/shared/result';
import { CatalogConflictError, type CatalogUnitOfWork } from './ports';

/** Dependências comuns dos casos de uso do catálogo (tudo injetado: relógio, ids e banco). */
export type CatalogDeps = {
  uow: CatalogUnitOfWork;
  clock: Clock;
  ids: IdGenerator;
};

/**
 * Executa o caso de uso e traduz um conflito de banco (nome/código repetido, categoria com
 * produto...) no `Result` com o código estável. Qualquer outro erro é bug e continua subindo.
 */
export async function guardConflicts<T>(work: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof CatalogConflictError) return err(new DomainError(error.kind));
    throw error;
  }
}
