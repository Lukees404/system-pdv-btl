import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalogDeps } from '@/lib/catalog';
import { listServices, type ServiceRecord } from '@/modules/catalog';
import { t } from '@/shared/i18n';
import { formatBRL, money } from '@/shared/money';

export const metadata: Metadata = { title: t('services.title') };

function ServiceList({ services }: { services: ServiceRecord[] }) {
  return (
    <ul className="item-list">
      {services.map((service) => (
        <li key={service.id} className="item">
          <Link className="item-link" href={`/servicos/${service.id}`}>
            <span className="item-title">{service.name}</span>
            <span className="item-meta">{formatBRL(money(service.priceCents))}</span>
            {/* Preço 0 é o valor provisório do seed (OQ-31): destacar para não virar preço real. */}
            {service.priceCents === 0 && !service.archivedAt ? (
              <span className="item-warning">{t('services.zeroPrice')}</span>
            ) : null}
          </Link>
          {service.isDisplacementFee ? (
            <span className="badge">{t('services.displacementFee')}</span>
          ) : null}
          {service.archivedAt ? (
            <span className="badge badge-muted">{t('catalog.archived')}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default async function ServicesPage() {
  const all = await listServices(getCatalogDeps(), { includeArchived: true });
  const active = all.filter((s) => !s.archivedAt);
  const archived = all.filter((s) => s.archivedAt);

  return (
    <>
      <div className="page-head">
        <h1>{t('services.title')}</h1>
        <Link className="button" href="/servicos/novo">
          {t('services.new')}
        </Link>
      </div>

      {active.length === 0 ? <p>{t('services.empty')}</p> : <ServiceList services={active} />}

      {archived.length > 0 ? (
        <section aria-labelledby="servicos-arquivados">
          <h2 id="servicos-arquivados">{t('services.archivedTitle')}</h2>
          <ServiceList services={archived} />
        </section>
      ) : null}
    </>
  );
}
