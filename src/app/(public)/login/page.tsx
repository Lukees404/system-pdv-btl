import type { Metadata } from 'next';
import { t } from '@/shared/i18n';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: t('auth.login.title') };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="card">
        <h1 className="brand">{t('app.name')}</h1>
        <h2>{t('auth.login.title')}</h2>
        <LoginForm />
      </div>
    </main>
  );
}
