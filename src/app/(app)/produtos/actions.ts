'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { withCatalogUser } from '@/lib/catalog';
import {
  performSaveProduct,
  performSetProductArchived,
  type FormActionResult,
} from '@/modules/catalog';

// Ações finas (ADR-019): autorizar (sessão) → validar e executar no módulo → mapear o resultado.
export async function saveProductAction(formData: FormData): Promise<FormActionResult> {
  const result = await withCatalogUser((context) =>
    performSaveProduct(context, Object.fromEntries(formData)),
  );
  if (result.ok) {
    revalidatePath('/produtos');
    redirect('/produtos');
  }
  return result;
}

export async function setProductArchivedAction(formData: FormData): Promise<FormActionResult> {
  const result = await withCatalogUser((context) =>
    performSetProductArchived(context, {
      id: formData.get('id'),
      archived: formData.get('archived') === 'true',
    }),
  );
  if (result.ok) revalidatePath('/produtos');
  return result;
}
