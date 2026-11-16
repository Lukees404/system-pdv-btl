import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalogDeps } from '@/lib/catalog';
import { listCategories } from '@/modules/catalog';
import { t } from '@/shared/i18n';
import { saveProductAction } from '../actions';
import { ProductForm } from '../product-form';

export const metadata: Metadata = { title: t('products.new') };

export default async function NewProductPage() {
  const categories = await listCategories(getCatalogDeps());

  return (
    <>
      <p>
        <Link href="/produtos">{t('catalog.back')}</Link>
      </p>
      <h1>{t('products.new')}</h1>
      <ProductForm action={saveProductAction} categories={categories} />
    </>
  );
}
