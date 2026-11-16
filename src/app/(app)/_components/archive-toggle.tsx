'use client';

import type { FormActionResult } from '@/modules/catalog';
import { t } from '@/shared/i18n';
import { useCatalogForm } from './use-catalog-form';

/**
 * Botão de arquivar/reativar (RN-CAT-04). Mostra o erro (por exemplo, reativar um nome que outro
 * item ativo já tomou) em vez de falhar em silêncio.
 */
export function ArchiveToggle({
  id,
  archived,
  action,
}: {
  id: string;
  /** Estado ATUAL do item; o botão faz o contrário. */
  archived: boolean;
  action: (formData: FormData) => Promise<FormActionResult>;
}) {
  const { formAction, isPending, formError } = useCatalogForm(action);

  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="archived" value={archived ? 'false' : 'true'} />
      <button type="submit" className="button button-secondary" disabled={isPending}>
        {archived ? t('catalog.reactivate') : t('catalog.archive')}
      </button>
      {formError ? (
        <p className="form-message form-error" role="alert">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
