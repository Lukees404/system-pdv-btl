import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/shared/i18n';
import { saveServiceAction } from '../actions';
import { ServiceForm } from '../service-form';

export const metadata: Metadata = { title: t('services.new') };

export default function NewServicePage() {
  return (
    <>
      <p>
        <Link href="/servicos">{t('catalog.back')}</Link>
      </p>
      <h1>{t('services.new')}</h1>
      <ServiceForm action={saveServiceAction} />
    </>
  );
}
