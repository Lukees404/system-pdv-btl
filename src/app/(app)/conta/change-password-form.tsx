'use client';

import { useActionState } from 'react';
import { t } from '@/shared/i18n';
import { changePasswordAction } from './actions';

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, null);

  return (
    <form action={formAction}>
      <div className="field">
        <label htmlFor="currentPassword">{t('account.changePassword.current')}</label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="newPassword">{t('account.changePassword.new')}</label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">{t('account.changePassword.confirm')}</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <p
        className={`form-message ${state?.ok ? 'form-success' : 'form-error'}`}
        role={state?.ok ? 'status' : 'alert'}
      >
        {state?.ok ? t('account.changePassword.success') : state ? state.message : null}
      </p>
      <button type="submit" className="button" disabled={isPending}>
        {isPending ? t('account.changePassword.submitting') : t('account.changePassword.submit')}
      </button>
    </form>
  );
}
