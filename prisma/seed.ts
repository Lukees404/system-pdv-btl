// Seed idempotente do catálogo (M2): categorias e serviços iniciais de `src/config/business.ts`.
// Só cria o que não existe e nunca altera preço nem nome já editados (rodar de novo é seguro).
// Uso: `pnpm db:seed`. Em produção, defina DATABASE_URL (usuário pdv_app) só na sessão do
// terminal. Imprime só contagens, nunca dados.
import { existsSync } from 'node:fs';
import { BUSINESS } from '@/config/business';
import { createDb } from '@/lib/db';
import { getEnv } from '@/lib/env';
import { PrismaCatalogUnitOfWork, seedCatalog } from '@/modules/catalog';
import { SystemClock } from '@/shared/clock';
import { UuidGenerator } from '@/shared/ids';

if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');

async function main(): Promise<void> {
  const db = createDb(getEnv().DATABASE_URL);
  try {
    const report = await seedCatalog(
      {
        uow: new PrismaCatalogUnitOfWork(db),
        clock: new SystemClock(),
        ids: new UuidGenerator(),
      },
      BUSINESS,
    );
    console.log(
      `seed: categorias +${report.categories.created} (${report.categories.skipped} já existiam), ` +
        `serviços +${report.services.created} (${report.services.skipped} já existiam)`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Falha inesperada no seed.');
  process.exit(1);
});
