import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalogDeps } from '@/lib/catalog';
import { getProduct, listCategories } from '@/modules/catalog';
import { t } from '@/shared/i18n';
import { ArchiveToggle } from '../../_components/archive-toggle';
import { saveProductAction, setProductArchivedAction } from '../actions';
import { ProductForm } from '../product-form';

export const metadata: Metadata = { title: t('products.edit') };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const deps = getCatalogDeps();
  const [product, categories] = await Promise.all([getProduct(deps, { id }), listCategories(deps)]);
  if (!product) notFound();

  return (
    <>
      <p>
        <Link href="/produtos">{t('catalog.back')}</Link>
      </p>
      <h1>{t('products.edit')}</h1>
      {product.archivedAt ? <p className="badge badge-muted">{t('catalog.archived')}</p> : null}
      <ProductForm action={saveProductAction} categories={categories} product={product} />
      <div className="page-actions">
        <ArchiveToggle
          id={product.id}
          archived={product.archivedAt !== null}
          action={setProductArchivedAction}
        />
      </div>
    </>
  );
}
