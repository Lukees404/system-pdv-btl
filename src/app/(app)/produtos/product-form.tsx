'use client';

import type { CategoryRecord, FormActionResult, ProductRecord } from '@/modules/catalog';
import { t, tf } from '@/shared/i18n';
import { formatMoneyInput, money } from '@/shared/money';
import { SelectField, TextField } from '../_components/field';
import { useCatalogForm } from '../_components/use-catalog-form';

type Props = {
  action: (formData: FormData) => Promise<FormActionResult>;
  categories: readonly Pick<CategoryRecord, 'id' | 'name'>[];
  /** Produto sendo editado; ausente = cadastro novo. */
  product?: ProductRecord;
};

const FISCAL_FIELDS = ['ncm', 'cest', 'cfop', 'csosn', 'origin', 'unit'];

export function ProductForm({ action, categories, product }: Props) {
  const { formAction, isPending, values, errorFor, formError } = useCatalogForm(action);
  // Depois de um erro vale o que foi digitado; senão, o valor salvo (edição) ou vazio (novo).
  const v = (name: string, saved: string): string => values[name] ?? saved;
  const hasFiscalError = FISCAL_FIELDS.some((name) => errorFor(name));

  return (
    <form action={formAction} noValidate>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <p className="hint">{t('catalog.requiredHint')}</p>

      <TextField
        name="name"
        label={t('products.form.name')}
        required
        maxLength={120}
        defaultValue={v('name', product?.name ?? '')}
        error={errorFor('name')}
      />
      <TextField
        name="price"
        label={t('products.form.price')}
        required
        inputMode="decimal"
        defaultValue={v('price', product ? formatMoneyInput(money(product.priceCents)) : '')}
        error={errorFor('priceCents')}
      />
      <TextField
        name="cost"
        label={t('products.form.cost')}
        hint={t('products.form.costHint')}
        inputMode="decimal"
        defaultValue={v(
          'cost',
          product?.costCents != null ? formatMoneyInput(money(product.costCents)) : '',
        )}
        error={errorFor('costCents')}
      />
      <TextField
        name="barcode"
        label={t('products.form.barcode')}
        inputMode="numeric"
        maxLength={64}
        defaultValue={v('barcode', product?.barcode ?? '')}
        error={errorFor('barcode')}
      />
      <SelectField
        name="categoryId"
        label={t('products.form.category')}
        defaultValue={v('categoryId', product?.categoryId ?? '')}
        error={errorFor('categoryId')}
        options={[
          { value: '', label: t('products.noCategory') },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
      <TextField
        name="minStock"
        label={t('products.form.minStock')}
        hint={t('products.form.minStockHint')}
        inputMode="numeric"
        defaultValue={v('minStock', String(product?.minStock ?? 0))}
        error={errorFor('minStock')}
      />
      {product ? (
        <p className="hint">{tf('products.form.stockHint', { qty: String(product.stockQty) })}</p>
      ) : null}

      <details className="fiscal" open={hasFiscalError}>
        <summary>{t('products.form.fiscal')}</summary>
        <p className="hint">{t('products.form.fiscalHint')}</p>
        <TextField
          name="ncm"
          label={t('products.form.ncm')}
          inputMode="numeric"
          maxLength={8}
          defaultValue={v('ncm', product?.ncm ?? '')}
          error={errorFor('ncm')}
        />
        <TextField
          name="cest"
          label={t('products.form.cest')}
          inputMode="numeric"
          maxLength={7}
          defaultValue={v('cest', product?.cest ?? '')}
          error={errorFor('cest')}
        />
        <TextField
          name="cfop"
          label={t('products.form.cfop')}
          inputMode="numeric"
          maxLength={4}
          defaultValue={v('cfop', product?.cfop ?? '')}
          error={errorFor('cfop')}
        />
        <TextField
          name="csosn"
          label={t('products.form.csosn')}
          inputMode="numeric"
          maxLength={3}
          defaultValue={v('csosn', product?.csosn ?? '')}
          error={errorFor('csosn')}
        />
        <TextField
          name="origin"
          label={t('products.form.origin')}
          inputMode="numeric"
          maxLength={1}
          defaultValue={v('origin', product?.origin != null ? String(product.origin) : '')}
          error={errorFor('origin')}
        />
        <TextField
          name="unit"
          label={t('products.form.unit')}
          maxLength={2}
          defaultValue={v('unit', product?.unit ?? 'UN')}
          error={errorFor('unit')}
        />
      </details>

      {formError ? (
        <p className="form-message form-error" role="alert">
          {formError}
        </p>
      ) : null}
      <button type="submit" className="button" disabled={isPending}>
        {isPending ? t('catalog.saving') : t('catalog.save')}
      </button>
    </form>
  );
}
