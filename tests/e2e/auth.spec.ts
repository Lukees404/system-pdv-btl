import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { errorMessage, t, tf } from '@/shared/i18n';
import { createE2eUser, type E2eUser } from './helpers/users';

async function signIn(page: Page, user: Pick<E2eUser, 'email' | 'password'>) {
  await page.goto('/login');
  await page.getByLabel(t('auth.login.email')).fill(user.email);
  await page.getByLabel(t('auth.login.password')).fill(user.password);
  await page.getByRole('button', { name: t('auth.login.submit') }).click();
}

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.length} nó(s)`)).toEqual([]);
}

test('[RF-AUT-01][RN-ACE-01] login válido leva à Início com a saudação e a navegação', async ({
  page,
}) => {
  const user = await createE2eUser();

  await signIn(page, user);

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: t('home.title') })).toBeVisible();
  await expect(page.getByText(tf('home.greeting', { name: user.name }))).toBeVisible();
  await expect(page.getByRole('navigation', { name: t('nav.label') })).toBeVisible();
});

test('[RF-AUT-01] senha errada mostra mensagem genérica e continua em /login', async ({ page }) => {
  const user = await createE2eUser();

  await signIn(page, { email: user.email, password: 'senha-errada-qualquer' });

  await expect(page.locator('p[role="alert"]')).toHaveText(errorMessage('INVALID_CREDENTIALS'));
  await expect(page).toHaveURL(/\/login$/);
});

test('[RF-AUT-02] sair encerra a sessão: voltar à raiz leva ao login', async ({ page }) => {
  const user = await createE2eUser();
  await signIn(page, user);
  await page.getByRole('link', { name: t('nav.account') }).click();

  await page.getByRole('button', { name: t('account.logout') }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

test('[RNF-SEG-04] rotas protegidas sem sessão redirecionam para /login', async ({ page }) => {
  for (const path of ['/', '/conta']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test('[RNF-SEG-04] cookie inventado passa o proxy mas a página barra no servidor', async ({
  context,
  page,
}) => {
  await context.addCookies([
    { name: 'pdv_session', value: 'token-inventado', url: 'http://localhost:3000' },
  ]);

  await page.goto('/conta');

  await expect(page).toHaveURL(/\/login$/);
});

test('[RF-AUT-03][RN-ACE-05] trocar a senha: a nova entra e a antiga não', async ({ page }) => {
  const user = await createE2eUser();
  const newPassword = `nova-${user.password}`;
  await signIn(page, user);
  await page.getByRole('link', { name: t('nav.account') }).click();

  await page.getByLabel(t('account.changePassword.current'), { exact: true }).fill(user.password);
  await page.getByLabel(t('account.changePassword.new'), { exact: true }).fill(newPassword);
  await page.getByLabel(t('account.changePassword.confirm'), { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: t('account.changePassword.submit') }).click();
  await expect(page.getByRole('status')).toHaveText(t('account.changePassword.success'));

  await page.getByRole('button', { name: t('account.logout') }).click();
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, { email: user.email, password: user.password });
  await expect(page.locator('p[role="alert"]')).toHaveText(errorMessage('INVALID_CREDENTIALS'));

  await signIn(page, { email: user.email, password: newPassword });
  await expect(page).toHaveURL(/\/$/);
});

// Logado, para que o proxy não redirecione ao login e o 404 seja o da própria rota.
test('[RN-ACE-06] não existe autocadastro: /signup e /register dão 404', async ({ page }) => {
  const user = await createE2eUser();
  await signIn(page, user);
  await expect(page).toHaveURL(/\/$/);

  for (const path of ['/signup', '/register']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  }
});

test('[RNF-USA-04] axe sem violações em /login, Início e Conta', async ({ page }) => {
  const user = await createE2eUser();

  await page.goto('/login');
  await expectNoAxeViolations(page);

  await signIn(page, user);
  await expect(page.getByRole('heading', { name: t('home.title') })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole('link', { name: t('nav.account') }).click();
  await expect(page.getByRole('heading', { name: t('account.title') })).toBeVisible();
  await expectNoAxeViolations(page);
});

test('[RNF-USA-01] alvos de toque da navegação e dos botões têm ao menos 44 px', async ({
  page,
}) => {
  const user = await createE2eUser();
  await signIn(page, user);
  await page.getByRole('link', { name: t('nav.account') }).click();

  const targets = [
    ...(await page
      .getByRole('navigation', { name: t('nav.label') })
      .getByRole('link')
      .all()),
    page.getByRole('button', { name: t('account.logout') }),
    page.getByRole('button', { name: t('account.changePassword.submit') }),
  ];
  for (const target of targets) {
    const box = await target.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});
