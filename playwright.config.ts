import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  // Local usa `next dev`, que compila cada rota na primeira visita; com muitos workers a CPU
  // (argon2 dos logins + compilação) estoura os prazos. No CI o build de produção não sofre disso.
  workers: isCI ? undefined : 2,
  expect: { timeout: 10_000 },
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    locale: 'pt-BR',
    timezoneId: 'America/Manaus',
  },
  projects: [
    // Celular de 360 px de largura (RNF-COM-02, RNF-USA-01).
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 740 } },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // No CI testa o build de produção; localmente, o servidor de desenvolvimento.
    // Em ambos é preciso Postgres de pé (`pnpm db:up`) para o /api/health.
    command: isCI ? 'pnpm build && pnpm start' : 'pnpm dev',
    url: `${baseURL}/api/health`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
