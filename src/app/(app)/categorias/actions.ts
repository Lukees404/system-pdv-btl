'use server';

import { revalidatePath } from 'next/cache';
import { withCatalogUser } from '@/lib/catalog';
import {
  performCreateCategory,
  performDeleteCategory,
  performRenameCategory,
  type FormActionResult,
} from '@/modules/catalog';

// Ações finas (ADR-019): autorizar (sessão) → validar e executar no módulo → mapear o resultado.
async function run(work: Parameters<typeof withCatalogUser>[0]): Promise<FormActionResult> {
  const result = await withCatalogUser(work);
  if (result.ok) revalidatePath('/categorias');
  return result;
}

export async function createCategoryAction(formData: FormData): Promise<FormActionResult> {
  return run((context) => performCreateCategory(context, Object.fromEntries(formData)));
}

export async function renameCategoryAction(formData: FormData): Promise<FormActionResult> {
  return run((context) => performRenameCategory(context, Object.fromEntries(formData)));
}

export async function deleteCategoryAction(formData: FormData): Promise<FormActionResult> {
  return run((context) => performDeleteCategory(context, Object.fromEntries(formData)));
}
