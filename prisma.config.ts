import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// O Prisma 7 não carrega .env sozinho. `loadEnvFile` não sobrescreve variáveis já definidas,
// então o ambiente (CI, testes) sempre vence o arquivo.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Conexão DIRETA, como dono do schema: usada só pelo CLI (migrar). A aplicação usa
    // DATABASE_URL (pooler, usuário só com DML) em src/lib/db.ts.
    // Sem DIRECT_URL, `prisma generate` ainda funciona (não conecta); migrar falha com
    // erro de conexão óbvio em vez de apontar para um banco por engano.
    url: process.env.DIRECT_URL ?? 'postgresql://missing-direct-url.invalid:5432/pdv',
  },
});
