import { normalizeText } from '@/shared/text';
import { createCategory } from './create-category';
import { createService } from './create-service';
import type { CatalogDeps } from './deps';
import { listCategories } from './list-categories';
import { listServices } from './list-services';

export type SeedCatalogInput = {
  categories: readonly string[];
  services: readonly {
    name: string;
    priceCents: number;
    isDisplacementFee?: boolean;
  }[];
};

export type SeedReport = {
  categories: { created: number; skipped: number };
  services: { created: number; skipped: number };
};

/**
 * Semeia as categorias e os serviços iniciais (dados em `config/business.ts`). Idempotente e
 * conservador: só cria o que NÃO existe, comparando o nome normalizado (sem acento e caixa) e
 * olhando também os serviços ARQUIVADOS (o dono que arquivou um serviço não o quer de volta);
 * nunca altera preço nem nome de nada que já exista. Se já existe uma taxa de deslocamento com
 * outro nome, a do seed é pulada (RN-SER-03). Dado do seed inválido é bug e lança exceção.
 */
export async function seedCatalog(deps: CatalogDeps, input: SeedCatalogInput): Promise<SeedReport> {
  const report: SeedReport = {
    categories: { created: 0, skipped: 0 },
    services: { created: 0, skipped: 0 },
  };

  const knownCategories = new Set((await listCategories(deps)).map((c) => c.nameNormalized));
  for (const name of input.categories) {
    if (knownCategories.has(normalizeText(name))) {
      report.categories.skipped += 1;
      continue;
    }
    const result = await createCategory(deps, { name });
    if (result.ok) report.categories.created += 1;
    else if (result.error.code === 'CATEGORY_NAME_TAKEN') report.categories.skipped += 1;
    else throw new Error(`Seed inválido (categoria): ${result.error.code}`);
  }

  const knownServices = new Set(
    (await listServices(deps, { includeArchived: true })).map((s) => s.nameNormalized),
  );
  for (const service of input.services) {
    if (knownServices.has(normalizeText(service.name))) {
      report.services.skipped += 1;
      continue;
    }
    const result = await createService(deps, service);
    if (result.ok) report.services.created += 1;
    else if (
      result.error.code === 'SERVICE_NAME_TAKEN' ||
      result.error.code === 'DISPLACEMENT_FEE_EXISTS'
    ) {
      report.services.skipped += 1;
    } else throw new Error(`Seed inválido (serviço): ${result.error.code}`);
  }

  return report;
}
