import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { t } from '@/shared/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: { default: t('app.name'), template: `%s · ${t('app.name')}` },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Renderização por requisição: o nonce da CSP muda a cada uma (RNF-SEG-01), então nenhuma
  // página pode ser pré-renderizada estaticamente (os scripts ficariam sem nonce e seriam barrados).
  await connection();

  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
