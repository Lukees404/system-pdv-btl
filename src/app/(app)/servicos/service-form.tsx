'use client';

import type { FormActionResult, ServiceRecord } from '@/modules/catalog';
import { t } from '@/shared/i18n';
import { formatMoneyInput, money } from '@/shared/money';
import { TextField } from '../_components/field';
import { useCatalogForm } from '../_components/use-catalog-form';

type Props = {
  action: (formData: FormData) => Promise<FormActionResult>;
  /** Serviço sendo editado; ausente = cadastro novo. */
  service?: ServiceRecord;
};

export function ServiceForm({ action, service }: Props) {
  const { formAction, isPending, values, errorFor, formError } = useCatalogForm(action);
  const v = (name: string, saved: string): string => values[name] ?? saved;
  const displacementError = errorFor('isDisplacementFee');

  return (
    <form action={formAction} noValidate>
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <p className="hint">{t('catalog.requiredHint')}</p>

      <TextField
        name="name"
        label={t('services.form.name')}
        required
        maxLength={120}
        defaultValue={v('name', service?.name ?? '')}
        error={errorFor('name')}
      />
      <TextField
        name="price"
        label={t('services.form.price')}
        required
        inputMode="decimal"
        defaultValue={v('price', service ? formatMoneyInput(money(service.priceCents)) : '')}
        error={errorFor('priceCents')}
      />

      {/* A marca da taxa só existe na criação: depois ela é a identidade da taxa única (RN-SER-03). */}
      {service ? null : (
        <div className="field">
          <label className="checkbox" htmlFor="isDisplacementFee">
            <input
              id="isDisplacementFee"
              name="isDisplacementFee"
              type="checkbox"
              defaultChecked={values.isDisplacementFee === 'on'}
              aria-describedby={
                displacementError
                  ? 'isDisplacementFee-hint isDisplacementFee-error'
                  : 'isDisplacementFee-hint'
              }
            />
            {t('services.form.displacement')}
          </label>
          <p id="isDisplacementFee-hint" className="hint">
            {t('services.form.displacementHint')}
          </p>
          {displacementError ? (
            <p id="isDisplacementFee-error" className="field-error" role="alert">
              {displacementError}
            </p>
          ) : null}
        </div>
      )}

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
