import type { Metadata } from 'next';
import { getCatalogDeps } from '@/lib/catalog';
import { listCategories } from '@/modules/catalog';
import { t } from '@/shared/i18n';
import { CategoryRow, CreateCategoryForm } from './category-forms';

export const metadata: Metadata = { title: t('categories.title') };

export default async function CategoriesPage() {
  const categories = await listCategories(getCatalogDeps());

  return (
    <>
      <h1>{t('categories.title')}</h1>
      <section aria-labelledby="nova-categoria" className="card card-wide">
        <h2 id="nova-categoria">{t('categories.new.label')}</h2>
        <CreateCategoryForm />
      </section>

      <p className="hint">{t('categories.deleteHint')}</p>
      {categories.length === 0 ? (
        <p>{t('categories.empty')}</p>
      ) : (
        <ul className="item-list">
          {categories.map((category) => (
            <CategoryRow key={category.id} id={category.id} name={category.name} />
          ))}
        </ul>
      )}
    </>
  );
}
