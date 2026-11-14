import { migrateDeploy, query } from './helpers/db';
import { loadTestEnv } from './helpers/env';

/**
 * Roda uma vez antes de toda a suíte de integração (docs/07 §4): confirma que o
 * Postgres de teste está de pé e aplica as migrações no banco `pdv_test`.
 */
export default async function setup(): Promise<void> {
  const { ownerUrl } = loadTestEnv();
  const { hostname, port } = new URL(ownerUrl);

  try {
    await query(ownerUrl, 'SELECT 1');
  } catch {
    throw new Error(
      `Postgres de teste indisponível em ${hostname}:${port}. ` +
        'Abra o Docker Desktop e rode `pnpm db:up` antes de `pnpm test:int`.',
    );
  }

  await migrateDeploy(ownerUrl);
}
