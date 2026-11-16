import 'server-only';
import {
  PrismaCatalogUnitOfWork,
  formFailure,
  type ActionContext,
  type CatalogDeps,
  type FormActionResult,
} from '@/modules/catalog';
import { currentUser } from '@/modules/auth';
import { SystemClock } from '@/shared/clock';
import { UuidGenerator } from '@/shared/ids';
import { getAuthContext } from './auth';
import { getDb } from './db';

/** Dependências reais do catálogo: banco, relógio e ids. Só código de servidor. */
export function getCatalogDeps(): CatalogDeps {
  return {
    uow: new PrismaCatalogUnitOfWork(getDb()),
    clock: new SystemClock(),
    ids: new UuidGenerator(),
  };
}

/**
 * Autorização de TODA Server Action do catálogo (RNF-SEG-04): confere a sessão a cada chamada
 * (esconder o botão não protege) e entrega o usuário que será gravado na auditoria.
 */
export async function withCatalogUser(
  run: (context: ActionContext) => Promise<FormActionResult>,
): Promise<FormActionResult> {
  const user = await currentUser(await getAuthContext());
  if (!user.ok) return formFailure('UNAUTHENTICATED');
  return run({ deps: getCatalogDeps(), actorUserId: user.value.userId });
}
