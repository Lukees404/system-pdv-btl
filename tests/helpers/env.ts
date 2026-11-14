import { existsSync } from 'node:fs';

export type TestEnv = {
  /** Conexão do dono do schema (roda migrações e prepara estado). */
  ownerUrl: string;
  /** Conexão da aplicação (privilégio mínimo). */
  appUrl: string;
};

/**
 * Lê as URLs do banco de teste. `loadEnvFile` não sobrescreve variáveis já definidas,
 * então o ambiente (CI) vence; localmente vale `.env` e, na falta dele, `.env.example`
 * (que já aponta para o Postgres do docker compose).
 */
export function loadTestEnv(): TestEnv {
  for (const file of ['.env', '.env.example']) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
  const ownerUrl = process.env.TEST_DIRECT_URL;
  const appUrl = process.env.TEST_DATABASE_URL;
  if (!ownerUrl || !appUrl) {
    throw new Error('Defina TEST_DIRECT_URL e TEST_DATABASE_URL (veja .env.example).');
  }
  return { ownerUrl, appUrl };
}
