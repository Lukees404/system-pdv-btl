import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth';
import { t } from '@/shared/i18n';
import { NavLinks } from './_components/nav-links';

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Defesa real (RNF-SEG-04): toda página do grupo exige sessão válida no servidor; o proxy
  // só faz a checagem otimista do cookie.
  await requireUser();

  return (
    <div className="shell">
      <a className="skip-link" href="#conteudo">
        {t('app.skipToContent')}
      </a>
      <header className="shell-header">
        <span className="brand">{t('app.name')}</span>
      </header>
      <nav className="shell-nav" aria-label={t('nav.label')}>
        <NavLinks />
      </nav>
      <main id="conteudo" className="shell-main">
        {children}
      </main>
    </div>
  );
}
