import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { errorMessage } from '@/shared/i18n';
import { FakeCookieJar, createAuthTestKit, type AuthTestKit } from '../test-support';
import { createUser } from './create-user';
import { currentUser, performChangePassword, performLogin, performLogout } from './session-actions';

const PASSWORD = 'senha-bem-longa-1';
const NEW_PASSWORD = 'senha-nova-456789';
const COOKIE = 'pdv_session';

describe('ações de sessão (banco real, cookies em memória)', () => {
  let kit: AuthTestKit;
  let counter = 0;

  const context = (jar = new FakeCookieJar()) => ({
    services: { uow: kit.uow, hasher: kit.hasher, tokens: kit.tokens, clock: kit.clock, ids: kit.ids },
    jar,
    isProduction: false,
  });

  const seedUser = async () => {
    counter += 1;
    const email = `acao${counter}@exemplo.com`;
    const created = await createUser(
      { uow: kit.uow, hasher: kit.hasher, clock: kit.clock, ids: kit.ids },
      { name: 'Usuária Ação', email, password: PASSWORD },
    );
    return { email, userId: created.ok ? created.value.id : '' };
  };

  /** Faz login pela ação e devolve o jar já com o cookie da sessão. */
  const loggedIn = async () => {
    const user = await seedUser();
    const jar = new FakeCookieJar();
    await performLogin(context(jar), { email: user.email, password: PASSWORD });
    return { ...user, jar };
  };

  const sessionCount = async (userId: string) =>
    (await kit.owner('SELECT 1 FROM sessions WHERE user_id = $1', [userId])).length;
  const hashOf = async (userId: string) =>
    (await kit.owner<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [userId]))[0]
      ?.password_hash;

  beforeAll(async () => {
    kit = await createAuthTestKit();
  }, 90_000);
  afterAll(async () => {
    await kit.close();
  });

  describe('performLogin', () => {
    it('[RF-AUT-01][RNF-SEG-02] sucesso: grava o cookie com o token e as opções seguras, e a sessão existe no servidor', async () => {
      const { email, userId } = await seedUser();
      const jar = new FakeCookieJar();

      const result = await performLogin(context(jar), { email, password: PASSWORD });

      expect(result).toEqual({ ok: true });
      expect(jar.setCalls).toHaveLength(1);
      const cookie = jar.setCalls[0]!;
      expect(cookie.name).toBe(COOKIE);
      expect(cookie.value).toMatch(/^token-\d+$/);
      expect(cookie.options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', secure: false });
      expect((cookie.options.expires as Date).getTime()).toBe(kit.clock.now().getTime() + 30 * 24 * 3600 * 1000);
      expect(await sessionCount(userId)).toBe(1);
    });

    it('[RF-AUT-01] credenciais erradas: mensagem genérica em pt-BR e NENHUM cookie', async () => {
      const { email } = await seedUser();
      const jar = new FakeCookieJar();

      const result = await performLogin(context(jar), { email, password: 'senha-errada-999' });

      expect(result).toEqual({
        ok: false,
        code: 'INVALID_CREDENTIALS',
        message: errorMessage('INVALID_CREDENTIALS'),
      });
      expect(jar.setCalls).toHaveLength(0);
    });

    it('[RF-AUT-01] conta bloqueada mostra EXATAMENTE a mesma mensagem (não revela que o e-mail existe)', async () => {
      const { email } = await seedUser();
      for (let i = 0; i < 5; i += 1) await performLogin(context(), { email, password: 'errada-1234567' });

      const locked = await performLogin(context(), { email, password: PASSWORD });
      const unknown = await performLogin(context(), { email: 'ninguem@exemplo.com', password: PASSWORD });

      expect(locked.ok === false && locked.message).toBe(unknown.ok === false && unknown.message);
    });

    it.each([
      ['null', null],
      ['lista', []],
      ['sem senha', { email: 'a@b.co' }],
      ['senha que não é texto', { email: 'a@b.co', password: 123 }],
    ])('[RNF-SEG-05] entrada inválida (%s) → INVALID_INPUT, sem tocar no banco nem no cookie', async (_l, raw) => {
      const jar = new FakeCookieJar();
      const hashes = kit.hasher.hashCalls + kit.hasher.verifyCalls;

      const result = await performLogin(context(jar), raw);

      expect(result.ok === false && result.code).toBe('INVALID_INPUT');
      expect(jar.setCalls).toHaveLength(0);
      expect(kit.hasher.hashCalls + kit.hasher.verifyCalls).toBe(hashes);
    });
  });

  describe('currentUser (a camada de acesso)', () => {
    it('[RNF-SEG-04] sem cookie ou com cookie inválido → UNAUTHENTICATED', async () => {
      const withoutCookie = await currentUser(context());
      const bogus = new FakeCookieJar();
      bogus.values.set(COOKIE, 'token-que-nao-existe');
      const withBogus = await currentUser(context(bogus));

      expect(!withoutCookie.ok && withoutCookie.error.code).toBe('UNAUTHENTICATED');
      expect(!withBogus.ok && withBogus.error.code).toBe('UNAUTHENTICATED');
    });

    it('[RNF-SEG-04] com a sessão válida devolve o usuário', async () => {
      const { jar, userId } = await loggedIn();

      const result = await currentUser(context(jar));

      expect(result.ok && result.value).toMatchObject({ userId, name: 'Usuária Ação', role: 'OWNER' });
    });
  });

  describe('performLogout', () => {
    it('[RF-AUT-02] apaga a sessão no servidor e o cookie', async () => {
      const { jar, userId } = await loggedIn();

      const result = await performLogout(context(jar));

      expect(result).toEqual({ ok: true });
      expect(await sessionCount(userId)).toBe(0);
      expect(jar.deleteCalls).toEqual([COOKIE]);
      expect((await currentUser(context(jar))).ok).toBe(false);
    });

    it('[RF-AUT-02] sair sem cookie não dá erro (idempotente)', async () => {
      const jar = new FakeCookieJar();

      expect(await performLogout(context(jar))).toEqual({ ok: true });
    });
  });

  describe('performChangePassword', () => {
    const form = (overrides: Record<string, unknown> = {}) => ({
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
      ...overrides,
    });

    it('[RNF-SEG-04] sem sessão → UNAUTHENTICATED e nada muda', async () => {
      const { userId } = await seedUser();
      const before = await hashOf(userId);

      const result = await performChangePassword(context(new FakeCookieJar()), form());

      expect(result.ok === false && result.code).toBe('UNAUTHENTICATED');
      expect(await hashOf(userId)).toBe(before);
    });

    it('[RF-AUT-03] sucesso: troca a senha, derruba as outras sessões e mantém o cookie atual intacto', async () => {
      const { email, jar, userId } = await loggedIn();
      await performLogin(context(), { email, password: PASSWORD }); // segunda sessão, em outro aparelho
      expect(await sessionCount(userId)).toBe(2);
      const cookieWrites = jar.setCalls.length;

      const result = await performChangePassword(context(jar), form());

      expect(result).toEqual({ ok: true });
      expect(await hashOf(userId)).toBe(`fake$${NEW_PASSWORD}`);
      expect(await sessionCount(userId)).toBe(1);
      expect(jar.setCalls).toHaveLength(cookieWrites);
      expect((await currentUser(context(jar))).ok).toBe(true);
    });

    it('[RF-AUT-03] confirmação diferente → PASSWORD_MISMATCH, sem calcular hash nem trocar nada', async () => {
      const { jar, userId } = await loggedIn();
      const before = await hashOf(userId);
      const hashes = kit.hasher.hashCalls;

      const result = await performChangePassword(context(jar), form({ confirmPassword: 'outra-coisa-123' }));

      expect(result.ok === false && result.code).toBe('PASSWORD_MISMATCH');
      expect(await hashOf(userId)).toBe(before);
      expect(kit.hasher.hashCalls).toBe(hashes);
    });

    it('[RNF-SEG-05] entrada inválida → INVALID_INPUT', async () => {
      const { jar } = await loggedIn();

      const result = await performChangePassword(context(jar), { currentPassword: PASSWORD });

      expect(result.ok === false && result.code).toBe('INVALID_INPUT');
    });

    it('[RF-AUT-03] senha atual errada e senha nova fraca devolvem mensagens específicas em pt-BR', async () => {
      const { jar } = await loggedIn();

      const wrongCurrent = await performChangePassword(context(jar), form({ currentPassword: 'nao-sou-eu-123' }));
      const weakNew = await performChangePassword(
        context(jar),
        form({ newPassword: 'curta', confirmPassword: 'curta' }),
      );

      expect(wrongCurrent).toEqual({
        ok: false,
        code: 'CURRENT_PASSWORD_INCORRECT',
        message: errorMessage('CURRENT_PASSWORD_INCORRECT'),
      });
      expect(weakNew).toEqual({ ok: false, code: 'WEAK_PASSWORD', message: errorMessage('WEAK_PASSWORD') });
    });

    it('[RNF-SEG-04] quem troca é SEMPRE o dono da sessão: um userId no formulário é ignorado (sem IDOR)', async () => {
      const attacker = await loggedIn();
      const victim = await seedUser();
      const victimBefore = await hashOf(victim.userId);

      await performChangePassword(context(attacker.jar), form({ userId: victim.userId }));

      expect(await hashOf(victim.userId)).toBe(victimBefore);
      expect(await hashOf(attacker.userId)).toBe(`fake$${NEW_PASSWORD}`);
    });
  });
});
