import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Dois projetos: `unit` (rápido, sem I/O) e `integration` (Postgres real).
// Convenção de nomes (docs/07 §5): `*.test.ts` = unitário, `*.int.test.ts` = integração.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'scripts/**/*.test.ts'],
          exclude: ['**/*.int.test.ts', '**/node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.int.test.ts', 'tests/**/*.int.test.ts'],
          exclude: ['**/node_modules/**'],
          // Um arquivo por vez: os testes compartilham o mesmo servidor de banco.
          fileParallelism: false,
          globalSetup: ['./tests/global-setup.ts'],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
