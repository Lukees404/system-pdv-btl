import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { t, tf } from '@/shared/i18n';

export const metadata: Metadata = { title: t('home.title') };

// Marcador: o resumo do dia (caixa, estoque baixo, vendas em espera) chega com os marcos M3 a M9.
export default async function HomePage() {
  const user = await requireUser();

  return (
    <>
      <h1>{t('home.title')}</h1>
      <p>{tf('home.greeting', { name: user.name })}</p>
    </>
  );
}
