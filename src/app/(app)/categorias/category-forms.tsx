'use client';

import { t } from '@/shared/i18n';
import { TextField } from '../_components/field';
import { useCatalogForm } from '../_components/use-catalog-form';
import { createCategoryAction, deleteCategoryAction, renameCategoryAction } from './actions';

export function CreateCategoryForm() {
  const { formAction, isPending, values, errorFor, formError } =
    useCatalogForm(createCategoryAction);

  return (
    <form action={formAction} noValidate>
      <TextField
        name="name"
        label={t('categories.new.label')}
        required
        maxLength={120}
        defaultValue={errorFor('name') || formError ? values.name : ''}
        error={errorFor('name')}
      />
      {formError ? (
        <p className="form-message form-error" role="alert">
          {formError}
        </p>
      ) : null}
      <button type="submit" className="button" disabled={isPending}>
        {t('categories.new.submit')}
      </button>
    </form>
  );
}

/** Uma categoria: renomear e excluir (só se estiver vazia; o banco decide, RN-CAT-07). */
export function CategoryRow({ id, name }: { id: string; name: string }) {
  const rename = useCatalogForm(renameCategoryAction);
  const remove = useCatalogForm(deleteCategoryAction);
  const inputId = `category-${id}`;

  return (
    <li className="item item-stack">
      <form action={rename.formAction} className="inline-form" noValidate>
        <input type="hidden" name="id" value={id} />
        <TextField
          id={inputId}
          name="name"
          label={t('categories.rename.label')}
          maxLength={120}
          defaultValue={rename.values.name ?? name}
          error={rename.errorFor('name')}
        />
        <button type="submit" className="button button-secondary" disabled={rename.isPending}>
          {t('catalog.rename')}
        </button>
      </form>
      <form action={remove.formAction} className="inline-form">
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="button button-secondary" disabled={remove.isPending}>
          {t('catalog.delete')}
        </button>
        {remove.formError ? (
          <p className="form-message form-error" role="alert">
            {remove.formError}
          </p>
        ) : null}
      </form>
    </li>
  );
}
