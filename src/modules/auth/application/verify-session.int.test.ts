import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuthTestKit, type AuthTestKit } from '../test-support';
import { createUser } from './create-user';
import { login } from './login';
import { logout } from './logout';
import { verifySession } from './verify-session';

const PASSWORD = 'senha-bem-longa-1';
const DAY = 24 * 60 * 60 * 1000;

describe('verifySession e logout (banco real)', () => {
  let kit: AuthTestKit;
  let counter = 0;

  const sessionDeps = () => ({ uow: kit.uow, tokens: kit.tokens, clock: kit.clock });

  const enter = async (name = 'Usuária Sessão') => {
    counter += 1;
    const email = `sessao${counter}@exemplo.com`;
    const created = await createUser(
      { uow: kit.uow, hasher: kit.hasher, clock: kit.clock, ids: kit.ids },
      { name, email, password: PASSWORD },
    );
    const userId = created.ok ? created.value.id : '';
    const logged = await login(
      { uow: kit.uow, hasher: kit.hasher, tokens: kit.tokens, clock: kit.clock, ids: kit.ids },
      { email, password: PASSWORD },
    );
    return { email, userId, token: logged.ok ? logged.value.token : '' };
  };

  const sessionRows = async (userId: string) =>
    kit.owner('SELECT 1 FROM sessions WHERE user_id = $1', [userId]);

  beforeAll(async () => {
    kit = await createAuthTestKit();
  }, 90_000);
  afterAll(async () => {
    await kit.close();
  });

  it('[RN-ACE-04] token válido devolve o usuário da sessão', async () => {
    const { userId, token } = await enter('Maria da Sessão');

    const result = await verifySession(sessionDeps(), token);

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toMatchObject({ userId, name: 'Maria da Sessão', role: 'OWNER' });
  });

  it('[RN-ACE-04] token desconhecido, vazio ou adulterado → UNAUTHENTICATED', async () => {
    const { token } = await enter();

    for (const bad of ['', 'token-que-nao-existe', `${token}x`]) {
      const result = await verifySession(sessionDeps(), bad);
      expect(!result.ok && result.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('[RN-ACE-04] a sessão vale até 1 ms antes de 30 dias e expira no instante exato (e é removida)', async () => {
    const { userId, token } = await enter();
    const start = kit.clock.now().getTime();

    kit.clock.advance(30 * DAY - 1);
    expect((await verifySession(sessionDeps(), token)).ok).toBe(true);

    kit.clock.advance(1); // exatamente start + 30 dias
    expect(kit.clock.now().getTime()).toBe(start + 30 * DAY);
    const expired = await verifySession(sessionDeps(), token);
    expect(!expired.ok && expired.error.code).toBe('UNAUTHENTICATED');
    expect(await sessionRows(userId)).toHaveLength(0);
  });

  it('[RN-ACE-04] desativar o usuário invalida a sessão que ele já tinha', async () => {
    const { email, token } = await enter();
    await kit.owner('UPDATE users SET active = false WHERE email = $1', [email]);

    const result = await verifySession(sessionDeps(), token);

    expect(!result.ok && result.error.code).toBe('UNAUTHENTICATED');
  });

  it('[RNF-SEG-02] o banco não contém o token em claro', async () => {
    const { token } = await enter();

    const found = await kit.owner('SELECT 1 FROM sessions WHERE token_hash = $1', [token]);

    expect(found).toHaveLength(0);
  });

  it('[RF-AUT-02] sair apaga a sessão no servidor: o mesmo token deixa de valer', async () => {
    const { userId, token } = await enter();

    await logout(sessionDeps(), token);

    expect(await sessionRows(userId)).toHaveLength(0);
    const result = await verifySession(sessionDeps(), token);
    expect(!result.ok && result.error.code).toBe('UNAUTHENTICATED');
  });

  it('[RF-AUT-02] sair é idempotente e sair de uma sessão não derruba as outras do usuário', async () => {
    const first = await enter();
    const second = await login(
      { uow: kit.uow, hasher: kit.hasher, tokens: kit.tokens, clock: kit.clock, ids: kit.ids },
      { email: first.email, password: PASSWORD },
    );
    const secondToken = second.ok ? second.value.token : '';

    await logout(sessionDeps(), first.token);
    await logout(sessionDeps(), first.token); // repetir não dá erro

    expect((await verifySession(sessionDeps(), secondToken)).ok).toBe(true);
  });
});
