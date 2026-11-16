import { z } from 'zod';
import type { ErrorCode } from '@/shared/errors';
import { errorMessage } from '@/shared/i18n';
import type { Result } from '@/shared/result';
import { archiveProduct } from './archive-product';
import { archiveService } from './archive-service';
import { parseProductForm, parseServiceForm } from './catalog-forms';
import { createCategory } from './create-category';
import { createProduct } from './create-product';
import { createService } from './create-service';
import { deleteCategory } from './delete-category';
import type { CatalogDeps } from './deps';
import { reactivateProduct } from './reactivate-product';
import { reactivateService } from './reactivate-service';
import { renameCategory } from './rename-category';
import { updateProduct } from './update-product';
import { updateService } from './update-service';

/**
 * Camada de ação das telas do catálogo (ADR-019): entrada de formulário (`unknown`) → validação
 * → caso de uso → `FormActionResult`. A AUTORIZAÇÃO (sessão válida) é de quem chama, na cola do
 * app (`src/lib`), que entrega o `actorUserId`; este módulo não conhece o módulo `auth`.
 */
export type ActionContext = { deps: CatalogDeps; actorUserId: string };

/** Código estável (para teste), mensagem em pt-BR e, quando há, o campo que errou. */
export type FormActionResult =
  { ok: true; id?: string } | { ok: false; code: ErrorCode; message: string; field?: string };

export function formFailure(code: ErrorCode, field?: string): FormActionResult {
  return { ok: false, code, message: errorMessage(code), ...(field ? { field } : {}) };
}

/** Conflitos que o banco decide não trazem campo; a tela precisa saber onde mostrar o erro. */
const CONFLICT_FIELD: Partial<Record<ErrorCode, string>> = {
  PRODUCT_NAME_TAKEN: 'name',
  CATEGORY_NAME_TAKEN: 'name',
  SERVICE_NAME_TAKEN: 'name',
  BARCODE_TAKEN: 'barcode',
  CATEGORY_NOT_FOUND: 'categoryId',
  DISPLACEMENT_FEE_EXISTS: 'isDisplacementFee',
};

function toResult(result: Result<unknown>, id?: string): FormActionResult {
  if (result.ok) return id === undefined ? { ok: true } : { ok: true, id };
  const { code, details } = result.error;
  const field = typeof details.field === 'string' ? details.field : CONFLICT_FIELD[code];
  return formFailure(code, field);
}

const idOnly = z.object({ id: z.string().min(1).max(64) });
const archiveInput = idOnly.extend({ archived: z.boolean() });
const categoryInput = z.object({ name: z.string().max(500) });
const optionalId = z.object({ id: z.string().max(64).optional() });

/** Cria (sem `id`) ou edita (com `id`) um produto (RF-CAT-01/02). */
export async function performSaveProduct(
  { deps, actorUserId }: ActionContext,
  raw: unknown,
): Promise<FormActionResult> {
  const target = optionalId.safeParse(raw);
  if (!target.success) return formFailure('INVALID_INPUT');
  const input = parseProductForm(raw);
  if (!input.ok) return toResult(input);

  const id = target.data.id;
  if (id) return toResult(await updateProduct(deps, { ...input.value, id, actorUserId }), id);

  const created = await createProduct(deps, input.value);
  return toResult(created, created.ok ? created.value.id : undefined);
}

/** Arquiva (`archived: true`) ou reativa um produto (RF-CAT-03); idempotente. */
export async function performSetProductArchived(
  { deps, actorUserId }: ActionContext,
  raw: unknown,
): Promise<FormActionResult> {
  const input = archiveInput.safeParse(raw);
  if (!input.success) return formFailure('INVALID_INPUT');
  const { id, archived } = input.data;
  return toResult(
    archived
      ? await archiveProduct(deps, { id, actorUserId })
      : await reactivateProduct(deps, { id, actorUserId }),
    id,
  );
}

/** Cria (sem `id`) ou edita (com `id`) um serviço (RF-CAT-07). A marca de taxa só vale ao criar. */
export async function performSaveService(
  { deps, actorUserId }: ActionContext,
  raw: unknown,
): Promise<FormActionResult> {
  const target = optionalId.safeParse(raw);
  if (!target.success) return formFailure('INVALID_INPUT');
  const input = parseServiceForm(raw);
  if (!input.ok) return toResult(input);

  const id = target.data.id;
  if (id) {
    const { name, priceCents } = input.value;
    return toResult(await updateService(deps, { id, actorUserId, name, priceCents }), id);
  }
  const created = await createService(deps, input.value);
  return toResult(created, created.ok ? created.value.id : undefined);
}

/** Arquiva ou reativa um serviço (RF-CAT-07); idempotente. */
export async function performSetServiceArchived(
  { deps, actorUserId }: ActionContext,
  raw: unknown,
): Promise<FormActionResult> {
  const input = archiveInput.safeParse(raw);
  if (!input.success) return formFailure('INVALID_INPUT');
  const { id, archived } = input.data;
  return toResult(
    archived
      ? await archiveService(deps, { id, actorUserId })
      : await reactivateService(deps, { id, actorUserId }),
    id,
  );
}

export async function performCreateCategory(
  { deps }: ActionContext,
  raw: unknown,
): Promise<FormActionResult> {
  const input = categoryInput.safeParse(raw);
  if (!input.success) return formFailure('INVALID_INPUT');
  const created = await createCategory(deps, { name: input.data.name });
  return toResult(created, created.ok ? created.value.id : undefined);
}

export async function performRenameCategory(
  { deps }: ActionContext,
  raw: unknown,
): Promise<FormActionResult> {
  const input = idOnly.merge(categoryInput).safeParse(raw);
  if (!input.success) return formFailure('INVALID_INPUT');
  return toResult(await renameCategory(deps, input.data), input.data.id);
}

export async function performDeleteCategory(
  { deps }: ActionContext,
  raw: unknown,
): Promise<FormActionResult> {
  const input = idOnly.safeParse(raw);
  if (!input.success) return formFailure('INVALID_INPUT');
  return toResult(await deleteCategory(deps, input.data), input.data.id);
}
