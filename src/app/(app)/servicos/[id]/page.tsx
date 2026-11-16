import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalogDeps } from '@/lib/catalog';
import { listServices } from '@/modules/catalog';
import { t } from '@/shared/i18n';
import { ArchiveToggle } from '../../_components/archive-toggle';
import { saveServiceAction, setServiceArchivedAction } from '../actions';
import { ServiceForm } from '../service-form';

export const metadata: Metadata = { title: t('services.edit') };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  // São poucos serviços: listar todos e escolher evita um caso de uso só para isto.
  const all = await listServices(getCatalogDeps(), { includeArchived: true });
  const service = all.find((s) => s.id === id);
  if (!service) notFound();

  return (
    <>
      <p>
        <Link href="/servicos">{t('catalog.back')}</Link>
      </p>
      <h1>{t('services.edit')}</h1>
      {service.isDisplacementFee ? <p className="badge">{t('services.displacementFee')}</p> : null}
      {service.archivedAt ? <p className="badge badge-muted">{t('catalog.archived')}</p> : null}
      <ServiceForm action={saveServiceAction} service={service} />
      <div className="page-actions">
        <ArchiveToggle
          id={service.id}
          archived={service.archivedAt !== null}
          action={setServiceArchivedAction}
        />
      </div>
    </>
  );
}
