import { expect, test } from '@playwright/test';
import { t } from '@/shared/i18n';

// Fumaça: prova que o app sobe de ponta a ponta (servidor + banco) nos dois perfis
// (celular de 360 px e desktop). Os fluxos de negócio chegam nos marcos seguintes.

test('[RNF-OBS-03] /api/health responde 200 com o banco no ar', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.json()).toEqual({ status: 'ok', db: 'up' });
});

test('[RNF-COM-02] a home mostra o nome do app e não rola na horizontal', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: t('app.name') })).toBeVisible();
  await expect(page).toHaveTitle(t('app.name'));

  const overflowsHorizontally = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflowsHorizontally).toBe(false);
});
