// Roda em processo próprio (tsx): o Playwright carrega TS como CommonJS e o client gerado do
// Prisma é ESM (`import.meta`). Os dados chegam por variáveis de ambiente, nunca por argumentos.
import { existsSync } from 'node:fs';
import { createDb } from '@/lib/db';
import { Argon2PasswordHasher, PrismaUnitOfWork, createUser } from '@/modules/auth';
import { SystemClock } from '@/shared/clock';
import { UuidGenerator } from '@/shared/ids';

if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');

async function main(): Promise<void> {
  const { E2E_NAME, E2E_EMAIL, E2E_PASSWORD, DATABASE_URL } = process.env;
  if (!DATABASE_URL) throw new Error('DATABASE_URL ausente: copie .env.example para .env.');
  if (!E2E_NAME || !E2E_EMAIL || !E2E_PASSWORD) throw new Error('Dados do usuário E2E ausentes.');

  const db = createDb(DATABASE_URL);
  try {
    const result = await createUser(
      {
        uow: new PrismaUnitOfWork(db),
        hasher: new Argon2PasswordHasher(),
        clock: new SystemClock(),
        ids: new UuidGenerator(),
      },
      { name: E2E_NAME, email: E2E_EMAIL, password: E2E_PASSWORD },
    );
    if (!result.ok) throw new Error(`Falha ao criar usuário E2E: ${result.error.code}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
