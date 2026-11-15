import type { Metadata } from 'next';
import { t } from '@/shared/i18n';
import { logoutAction } from './actions';
import { ChangePasswordForm } from './change-password-form';

export const metadata: Metadata = { title: t('account.title') };

export default function AccountPage() {
  return (
    <>
      <h1>{t('account.title')}</h1>
      <section aria-labelledby="troca-senha">
        <h2 id="troca-senha">{t('account.changePassword.title')}</h2>
        <p className="hint">{t('account.changePassword.hint')}</p>
        <ChangePasswordForm />
      </section>
      <form action={logoutAction} className="page-actions">
        <button type="submit" className="button button-secondary">
          {t('account.logout')}
        </button>
      </form>
    </>
  );
}
