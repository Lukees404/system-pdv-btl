import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLogger } from '@/lib/logger';
import { createAuthTestKit, type AuthTestKit } from '../test-support';
import { createUser } from './create-user';
import { login } from './login';

const PASSWORD = 'senha-bem-longa-1';
const MINUTE = 60_000;

describe('login (banco real)', () => {
  let kit: AuthTestKit;
  let counter = 0;

  const loginDeps = (extra: { logger?: ReturnType<typeof createLogger> } = {}) => ({
    uow: kit.uow,
    hasher: kit.hasher,
    tokens: kit.tokens,
    clock: kit.clock,
    ids: kit.ids,
    ...extra,
  });

  const seedUser = async (name = 'Usuária Teste') => {
    counter += 1;
    const email = `login${counter}@exemplo.com`;
    const created = await createUser(
      { uow: kit.uow, hasher: kit.hasher, clock: kit.clock, ids: kit.ids },
      { name, email, password: PASSWORD },
    );
    return { email, id: created.ok ? created.value.id : '' };
  };

  const readUser = async (email: string) => {
    const [row] = await kit.owner<{
      id: string;
      failed_attempts: number;
      locked_until: Date | null;
    }>('SELECT id, failed_attempts, locked_until FROM users WHERE email = $1', [email]);
    return row!;
  };

  const sessionsOf = async (userId: string) =>
    kit.owner<{ token_hash: string; expires_at: Date }>(
      'SELECT token_hash, expires_at FROM sessions WHERE user_id = $1',
      [userId],
    );

  const wrong = (email: string) => login(loginDeps(), { email, password: 'senha-errada-123' });
  const codeOf = (result: Awaited<ReturnType<typeof login>>) =>
    result.ok ? null : result.error.code;

  beforeAll(async () => {
    kit = await createAuthTestKit();
  }, 90_000);
  afterAll(async () => {
    await kit.close();
  });

  it('[RF-AUT-01][RN-ACE-01] credenciais certas criam a sessão: token só no retorno, hash no banco, 30 dias', async () => {
    const { email, id } = await seedUser();

    const result = await login(loginDeps(), {
      email: `  ${email.toUpperCase()} `,
      password: PASSWORD,
    });

    expect(result.ok).toBe(true);
    const value = result.ok ? result.value : undefined;
    expect(value?.userId).toBe(id);
    expect(value?.expiresAt.getTime()).toBe(kit.clock.now().getTime() + 30 * 24 * 60 * MINUTE);
    const [session] = await sessionsOf(id);
    expect(session?.token_hash).toBe(kit.tokens.hash(value!.token));
    expect(session?.token_hash).not.toBe(value?.token);
  });

  it('[RF-AUT-01] senha errada → INVALID_CREDENTIALS, conta uma falha e não cria sessão', async () => {
    const { email, id } = await seedUser();

    const result = await wrong(email);

    expect(codeOf(result)).toBe('INVALID_CREDENTIALS');
    expect((await readUser(email)).failed_attempts).toBe(1);
    expect(await sessionsOf(id)).toHaveLength(0);
  });

  it('[RF-AUT-01][RNF-SEG-03] e-mail inexistente ou inválido dá a MESMA resposta e ainda calcula um hash (contra enumeração por tempo)', async () => {
    const hashesBefore = kit.hasher.hashCalls;

    const unknown = await login(loginDeps(), { email: 'ninguem@exemplo.com', password: PASSWORD });
    const malformed = await login(loginDeps(), { email: 'nao-e-email', password: PASSWORD });

    expect(codeOf(unknown)).toBe('INVALID_CREDENTIALS');
    expect(codeOf(malformed)).toBe('INVALID_CREDENTIALS');
    expect(kit.hasher.hashCalls).toBe(hashesBefore + 2);
  });

  it('[RF-AUT-01] usuário inativo não entra, mesmo com a senha certa', async () => {
    const { email, id } = await seedUser();
    await kit.owner('UPDATE users SET active = false WHERE email = $1', [email]);

    const result = await login(loginDeps(), { email, password: PASSWORD });

    expect(codeOf(result)).toBe('INVALID_CREDENTIALS');
    expect(await sessionsOf(id)).toHaveLength(0);
  });

  it('[RF-AUT-01] senha acima do limite é recusada sem gastar CPU com hash', async () => {
    const { email } = await seedUser();
    const calls = kit.hasher.hashCalls + kit.hasher.verifyCalls;

    const result = await login(loginDeps(), { email, password: 'x'.repeat(129) });

    expect(codeOf(result)).toBe('INVALID_CREDENTIALS');
    expect(kit.hasher.hashCalls + kit.hasher.verifyCalls).toBe(calls);
  });

  it('[RF-AUT-01][RNF-SEG-03] 5 falhas seguidas bloqueiam por 15 min; a 6ª tentativa, mesmo com a senha certa, é recusada e não soma falha', async () => {
    const { email, id } = await seedUser();

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      expect(codeOf(await wrong(email))).toBe('INVALID_CREDENTIALS');
      expect((await readUser(email)).locked_until).toBeNull();
    }
    expect(codeOf(await wrong(email))).toBe('INVALID_CREDENTIALS');

    const locked = await readUser(email);
    expect(locked.failed_attempts).toBe(5);
    expect(locked.locked_until?.getTime()).toBe(kit.clock.now().getTime() + 15 * MINUTE);

    const attempt = await login(loginDeps(), { email, password: PASSWORD });
    expect(codeOf(attempt)).toBe('ACCOUNT_LOCKED');
    expect(await sessionsOf(id)).toHaveLength(0);
    expect((await readUser(email)).failed_attempts).toBe(5);
  });

  it('[RF-AUT-01][RNF-SEG-03] passado o bloqueio a senha certa entra e zera o contador; uma falha logo depois escala para 30 min', async () => {
    const first = await seedUser();
    for (let i = 0; i < 5; i += 1) await wrong(first.email);
    kit.clock.advance(15 * MINUTE);

    const ok = await login(loginDeps(), { email: first.email, password: PASSWORD });
    expect(ok.ok).toBe(true);
    expect(await readUser(first.email)).toMatchObject({ failed_attempts: 0, locked_until: null });

    const second = await seedUser();
    for (let i = 0; i < 5; i += 1) await wrong(second.email);
    kit.clock.advance(15 * MINUTE);
    await wrong(second.email); // 6ª falha, já desbloqueado

    const escalated = await readUser(second.email);
    expect(escalated.failed_attempts).toBe(6);
    expect(escalated.locked_until?.getTime()).toBe(kit.clock.now().getTime() + 30 * MINUTE);
  });

  it('[RF-AUT-01] um login correto zera falhas parciais', async () => {
    const { email } = await seedUser();
    await wrong(email);
    await wrong(email);
    await wrong(email);

    await login(loginDeps(), { email, password: PASSWORD });

    expect((await readUser(email)).failed_attempts).toBe(0);
  });

  it('[RNF-SEG-03] 5 tentativas erradas SIMULTÂNEAS também bloqueiam (contagem atômica no banco)', async () => {
    const { email } = await seedUser();

    await Promise.all(Array.from({ length: 5 }, () => wrong(email)));

    const user = await readUser(email);
    expect(user.failed_attempts).toBe(5);
    expect(user.locked_until).not.toBeNull();
  });

  it('[RNF-LGPD-05] o log de falha traz o id do usuário, nunca e-mail, nome nem senha', async () => {
    const lines: string[] = [];
    const logger = createLogger({
      clock: kit.clock,
      level: 'debug',
      write: (line) => lines.push(line),
    });
    const { email, id } = await seedUser('Nome Que Nao Pode Vazar');

    await login(loginDeps({ logger }), { email, password: 'senha-errada-999' });
    await login(loginDeps({ logger }), {
      email: 'fantasma@exemplo.com',
      password: 'senha-errada-999',
    });

    const output = lines.join('\n');
    expect(output).toContain(id);
    expect(output).not.toContain(email);
    expect(output).not.toContain('fantasma@exemplo.com');
    expect(output).not.toContain('Nome Que Nao Pode Vazar');
    expect(output).not.toContain('senha-errada-999');
  });

  it('[RF-AUT-01] o hash de senha roda FORA da transação (não segura conexão do pool durante a CPU pesada)', async () => {
    const { email } = await seedUser();
    let insideTransaction = false;
    const hashedInside: boolean[] = [];
    const uow = {
      run: <T>(work: Parameters<typeof kit.uow.run<T>>[0]) =>
        kit.uow.run(async (context) => {
          insideTransaction = true;
          try {
            return await work(context);
          } finally {
            insideTransaction = false;
          }
        }),
    };
    const hasher = {
      hash: async (password: string) => {
        hashedInside.push(insideTransaction);
        return kit.hasher.hash(password);
      },
      verify: async (hash: string, password: string) => {
        hashedInside.push(insideTransaction);
        return kit.hasher.verify(hash, password);
      },
    };

    await login({ ...loginDeps(), uow, hasher }, { email, password: PASSWORD });
    await login(
      { ...loginDeps(), uow, hasher },
      { email: 'ninguem@exemplo.com', password: PASSWORD },
    );

    expect(hashedInside).toEqual([false, false]);
  });
});
