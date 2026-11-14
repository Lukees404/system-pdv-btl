import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { t } from '@/shared/i18n';

export const metadata: Metadata = {
  title: t('app.name'),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
