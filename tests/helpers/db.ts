import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import { Client } from 'pg';
import { UuidGenerator } from '../../src/shared/ids';
import { loadTestEnv } from './env';

const run = promisify(execFile);
const require = createRequire(import.meta.url);

export type IsolatedDatabase = {
  /** Conexão do dono (DDL e preparação de estado). */
  ownerUrl: string;
  /** Conexão com o papel da aplicação (privilégio mínimo). */
  appUrl: string;
  /** Apaga o banco (derruba conexões abertas). */
  drop: () => Promise<void>;
};

/** Executa uma consulta numa conexão curta e devolve as linhas. */
export async function query<T = Record<string, unknown>>(
  url: string,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    await client.end();
  }
}

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

/** Aplica `prisma migrate deploy` no banco apontado por `directUrl` (como dono do schema). */
export async function migrateDeploy(directUrl: string): Promise<void> {
  // Chama o CLI pelo Node (e não por `pnpm`): evita o shim `.cmd` do Windows.
  const prismaCli = require.resolve('prisma/build/index.js');
  try {
    await run(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: process.cwd(),
      env: { ...process.env, DIRECT_URL: directUrl },
    });
  } catch (error) {
    const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
    throw new Error(`prisma migrate deploy falhou:\n${stdout}\n${stderr}`);
  }
}

/**
 * Cria um banco novo e vazio só para um arquivo de teste (isolamento, docs/07 §4).
 * Com `migrate: true` já devolve o banco com todas as migrações aplicadas.
 */
export async function createIsolatedDatabase(
  options: { migrate?: boolean } = {},
): Promise<IsolatedDatabase> {
  const { ownerUrl: adminUrl, appUrl: baseAppUrl } = loadTestEnv();
  const name = `pdv_it_${new UuidGenerator().next().replaceAll('-', '').slice(0, 16)}`;

  await query(adminUrl, `CREATE DATABASE ${name}`);
  const database: IsolatedDatabase = {
    ownerUrl: withDatabase(adminUrl, name),
    appUrl: withDatabase(baseAppUrl, name),
    drop: async () => {
      await query(adminUrl, `DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    },
  };

  if (options.migrate) {
    try {
      await migrateDeploy(database.ownerUrl);
    } catch (error) {
      await database.drop();
      throw error;
    }
  }
  return database;
}

/** Esvazia todas as tabelas do schema public, menos o histórico de migrações. */
export async function truncateAll(ownerUrl: string): Promise<void> {
  const tables = await query<{ tablename: string }>(
    ownerUrl,
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  if (tables.length === 0) return;
  const list = tables.map((table) => `"${table.tablename}"`).join(', ');
  await query(ownerUrl, `TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}
