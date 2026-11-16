import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalogDeps } from '@/lib/catalog';
import { listCategories, searchProducts } from '@/modules/catalog';
import { t } from '@/shared/i18n';
import { formatBRL, money } from '@/shared/money';

export const metadata: Metadata = { title: t('products.title') };

const PAGE_SIZE = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? '';

function pageUrl(q: string, arquivados: boolean, pagina: number): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (arquivados) params.set('arquivados', '1');
  if (pagina > 1) params.set('pagina', String(pagina));
  const query = params.toString();
  return query ? `/produtos?${query}` : '/produtos';
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const q = first(raw.q).slice(0, 200);
  const includeArchived = first(raw.arquivados) === '1';
  const page = Math.min(1000, Math.max(1, Math.trunc(Number(first(raw.pagina))) || 1));

  const deps = getCatalogDeps();
  // Pede um a mais para saber se existe próxima página, sem contar a tabela toda.
  const [found, categories] = await Promise.all([
    searchProducts(deps, {
      query: q,
      includeArchived,
      limit: PAGE_SIZE + 1,
      offset: (page - 1) * PAGE_SIZE,
    }),
    listCategories(deps),
  ]);
  const products = found.slice(0, PAGE_SIZE);
  const hasNext = found.length > PAGE_SIZE;
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <>
      <div className="page-head">
        <h1>{t('products.title')}</h1>
        <Link className="button" href="/produtos/novo">
          {t('products.new')}
        </Link>
      </div>

      <form method="get" action="/produtos" role="search" className="toolbar">
        <div className="field">
          <label htmlFor="q">{t('products.search.label')}</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t('products.search.placeholder')}
            autoComplete="off"
          />
        </div>
        <label className="checkbox">
          <input type="checkbox" name="arquivados" value="1" defaultChecked={includeArchived} />
          {t('products.showArchived')}
        </label>
        <button type="submit" className="button button-secondary">
          {t('products.search.submit')}
        </button>
      </form>

      {products.length === 0 ? (
        <p>{t('products.empty')}</p>
      ) : (
        <ul className="item-list">
          {products.map((product) => (
            <li key={product.id} className="item">
              <Link className="item-link" href={`/produtos/${product.id}`}>
                <span className="item-title">{product.name}</span>
                <span className="item-meta">
                  {formatBRL(money(product.priceCents))} · {t('products.stock')}: {product.stockQty}
                  {' · '}
                  {(product.categoryId && categoryName.get(product.categoryId)) ||
                    t('products.noCategory')}
                </span>
              </Link>
              {product.archivedAt ? (
                <span className="badge badge-muted">{t('catalog.archived')}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <nav className="pager" aria-label={t('products.title')}>
        {page > 1 ? (
          <Link className="button button-secondary" href={pageUrl(q, includeArchived, page - 1)}>
            {t('products.previous')}
          </Link>
        ) : null}
        {hasNext ? (
          <Link className="button button-secondary" href={pageUrl(q, includeArchived, page + 1)}>
            {t('products.next')}
          </Link>
        ) : null}
      </nav>
    </>
  );
}
