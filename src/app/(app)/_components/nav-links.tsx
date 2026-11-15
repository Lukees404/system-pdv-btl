'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/shared/i18n';

// Só as telas que já existem; Venda, Caixa, Produtos e Clientes entram com os seus marcos (ADR-017).
const ITEMS = [
  { href: '/', label: t('nav.home') },
  { href: '/conta', label: t('nav.account') },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="nav-list">
      {ITEMS.map((item) => {
        const isCurrent = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              className="nav-link"
              href={item.href}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
