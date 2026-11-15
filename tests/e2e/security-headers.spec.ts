import { expect, test } from '@playwright/test';

// Em desenvolvimento a CSP libera `unsafe-eval` (React); o CI roda o build de produção.

test('[RNF-SEG-01] cabeçalhos de segurança e CSP com nonce diferente a cada requisição', async ({
  request,
}) => {
  const first = await request.get('/login');
  const second = await request.get('/login');
  const csp = first.headers()['content-security-policy'] ?? '';
  const nonceOf = (value: string) => /'nonce-([^']+)'/.exec(value)?.[1];

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(nonceOf(csp)).toBeTruthy();
  expect(nonceOf(csp)).not.toBe(nonceOf(second.headers()['content-security-policy'] ?? ''));
  expect(first.headers()['x-content-type-options']).toBe('nosniff');
  expect(first.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(first.headers()['permissions-policy']).toContain('camera=()');
});

test('[RNF-SEG-01] /api/health também recebe os cabeçalhos fixos', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.headers()['x-content-type-options']).toBe('nosniff');
});

test('[RNF-SEG-01] a tela de login hidrata sem violações de CSP e o nonce está nos scripts', async ({
  page,
}) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (/content security policy/i.test(message.text())) problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));

  await page.goto('/login');
  // Hidratou de verdade: o botão desabilita ao enviar, então o JavaScript está ativo.
  await page.getByLabel('E-mail').fill('a@b.co');
  await page.waitForLoadState('networkidle');

  const scriptsWithoutNonce = await page.evaluate(
    () => [...document.scripts].filter((s) => s.src === '' && !s.nonce && s.textContent).length,
  );
  expect(scriptsWithoutNonce).toBe(0);
  expect(problems).toEqual([]);
});
