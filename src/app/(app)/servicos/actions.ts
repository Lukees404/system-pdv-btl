'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { withCatalogUser } from '@/lib/catalog';
import {
  performSaveService,
  performSetServiceArchived,
  type FormActionResult,
} from '@/modules/catalog';

// Ações finas (ADR-019): autorizar (sessão) → validar e executar no módulo → mapear o resultado.
export async function saveServiceAction(formData: FormData): Promise<FormActionResult> {
  const result = await withCatalogUser((context) =>
    performSaveService(context, Object.fromEntries(formData)),
  );
  if (result.ok) {
    revalidatePath('/servicos');
    redirect('/servicos');
  }
  return result;
}

export async function setServiceArchivedAction(formData: FormData): Promise<FormActionResult> {
  const result = await withCatalogUser((context) =>
    performSetServiceArchived(context, {
      id: formData.get('id'),
      archived: formData.get('archived') === 'true',
    }),
  );
  if (result.ok) revalidatePath('/servicos');
  return result;
}
