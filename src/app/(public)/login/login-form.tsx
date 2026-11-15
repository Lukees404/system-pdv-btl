'use client';

import { useActionState, useState } from 'react';
import { t } from '@/shared/i18n';
import { loginAction } from './actions';

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  // O React limpa os campos não controlados depois da ação; o e-mail fica no estado para não ser
  // redigitado a cada erro. A senha é sempre limpa.
  const [email, setEmail] = useState('');

  return (
    <form action={formAction}>
      <div className="field">
        <label htmlFor="email">{t('auth.login.email')}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="password">{t('auth.login.password')}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <p className="form-message form-error" role="alert">
        {state && !state.ok ? state.message : null}
      </p>
      <button type="submit" className="button button-block" disabled={isPending}>
        {isPending ? t('auth.login.submitting') : t('auth.login.submit')}
      </button>
    </form>
  );
}
