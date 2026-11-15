import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaAuditLog } from '@/modules/audit';
import { PrismaUnitOfWork } from '../infrastructure/prisma-unit-of-work';
import { createAuthTestKit, type AuthTestKit } from '../test-support';
import { changePassword } from './change-password';
import { createUser } from './create-user';
import { login } from './login';
import { verifySession } from './verify-session';

const OLD = 'senha-antiga-123';
const NEW = 'senha-nova-456789';

describe('changePassword (banco real)', () => {
  let kit: AuthTestKit;
  let counter = 0;

  const loginDeps = () => ({
    uow: kit.uow,
    hasher: kit.hasher,
    tokens: kit.tokens,
    clock: kit.clock,
    ids: kit.ids,
  });
  const changeDeps = (uow = kit.uow) => ({ uow, hasher: kit.hasher, tokens: kit.tokens, clock: kit.clock });

  /** Cria um usuário e abre `sessions` sessões (uma por login). */
  const seed = async (sessions = 2) => {
    counter += 1;
    const email = `troca${counter}@exemplo.com`;
    const created = await createUser(
      { uow: kit.uow, hasher: kit.hasher, clock: kit.clock, ids: kit.ids },
      { name: 'Troca Senha', email, password: OLD },
    );
    const userId = created.ok ? created.value.id : '';
    const tokens: string[] = [];
    for (let i = 0; i < sessions; i += 1) {
      const logged = await login(loginDeps(), { email, password: OLD });
      tokens.push(logged.ok ? logged.value.token : '');
    }
    return { email, userId, tokens };
  };

  const hashOf = async (userId: string) =>
    (await kit.owner<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [userId]))[0]
      ?.password_hash;
  const sessionCount = async (userId: string) =>
    (await kit.owner('SELECT 1 FROM sessions WHERE user_id = $1', [userId])).length;
  const codeOf = (result: Awaited<ReturnType<typeof changePassword>>) => (result.ok ? null : result.error.code);

  beforeAll(async () => {
    kit = await createAuthTestKit();
  }, 90_000);
  afterAll(async () => {
    await kit.close();
  });

  it('[RF-AUT-03][RN-ACE-04] troca o hash, apaga as OUTRAS sessões e mantém a atual', async () => {
    const { userId, tokens } = await seed(3);
    const other = await seed(1);

    const result = await changePassword(changeDeps(), {
      userId,
      sessionToken: tokens[0]!,
      currentPassword: OLD,
      newPassword: NEW,
    });

    expect(result.ok).toBe(true);
    expect(await hashOf(userId)).toBe(`fake$${NEW}`);
    expect((await verifySession(changeDeps(), tokens[0]!)).ok).toBe(true);
    expect((await verifySession(changeDeps(), tokens[1]!)).ok).toBe(false);
    expect((await verifySession(changeDeps(), tokens[2]!)).ok).toBe(false);
    expect(await sessionCount(userId)).toBe(1);
    expect(await sessionCount(other.userId)).toBe(1); // sessões de outro usuário não são tocadas
  });

  it('[RF-AUT-03] depois da troca a senha nova entra e a antiga não', async () => {
    const { email, userId, tokens } = await seed(1);
    await changePassword(changeDeps(), { userId, sessionToken: tokens[0]!, currentPassword: OLD, newPassword: NEW });

    const withOld = await login(loginDeps(), { email, password: OLD });
    const withNew = await login(loginDeps(), { email, password: NEW });

    expect(withOld.ok).toBe(false);
    expect(withNew.ok).toBe(true);
  });

  it('[RN-ACE-02][RN-ACE-03] audita user.password_changed só com IDs, na mesma transação', async () => {
    const { userId, tokens } = await seed(1);

    await changePassword(changeDeps(), { userId, sessionToken: tokens[0]!, currentPassword: OLD, newPassword: NEW });

    const [audit] = await kit.owner<{ action: string; entity_type: string; entity_id: string; user_id: string; data: unknown }>(
      "SELECT action, entity_type, entity_id, user_id, data FROM audit_log WHERE action = 'user.password_changed' AND entity_id = $1",
      [userId],
    );
    expect(audit).toMatchObject({ entity_type: 'user', entity_id: userId, user_id: userId, data: {} });
    expect(JSON.stringify(audit)).not.toContain(NEW);
    expect(JSON.stringify(audit)).not.toContain(OLD);
  });

  it('[RF-AUT-03] senha atual errada → CURRENT_PASSWORD_INCORRECT, nada muda, sem auditoria, e conta uma falha', async () => {
    const { userId, tokens } = await seed(2);
    const before = await hashOf(userId);

    const result = await changePassword(changeDeps(), {
      userId,
      sessionToken: tokens[0]!,
      currentPassword: 'nao-e-a-senha-1',
      newPassword: NEW,
    });

    expect(codeOf(result)).toBe('CURRENT_PASSWORD_INCORRECT');
    expect(await hashOf(userId)).toBe(before);
    expect(await sessionCount(userId)).toBe(2);
    const audits = await kit.owner("SELECT 1 FROM audit_log WHERE action = 'user.password_changed' AND entity_id = $1", [userId]);
    expect(audits).toHaveLength(0);
    const [user] = await kit.owner<{ failed_attempts: number }>('SELECT failed_attempts FROM users WHERE id = $1', [userId]);
    expect(user?.failed_attempts).toBe(1);
  });

  it('[RF-AUT-03][RN-ACE-05] senha nova fraca → WEAK_PASSWORD e nada muda (outras sessões continuam)', async () => {
    const { userId, tokens } = await seed(2);
    const before = await hashOf(userId);

    const result = await changePassword(changeDeps(), {
      userId,
      sessionToken: tokens[0]!,
      currentPassword: OLD,
      newPassword: 'curta',
    });

    expect(codeOf(result)).toBe('WEAK_PASSWORD');
    expect(await hashOf(userId)).toBe(before);
    expect(await sessionCount(userId)).toBe(2);
  });

  it('[RNF-SEG-03] adivinhar a senha atual com uma sessão roubada também bloqueia: 5 erros e a 6ª tentativa (mesmo certa) é recusada', async () => {
    const { userId, tokens } = await seed(1);
    const before = await hashOf(userId);

    for (let i = 0; i < 5; i += 1) {
      await changePassword(changeDeps(), {
        userId,
        sessionToken: tokens[0]!,
        currentPassword: `chute-${i}-errado`,
        newPassword: NEW,
      });
    }
    const sixth = await changePassword(changeDeps(), {
      userId,
      sessionToken: tokens[0]!,
      currentPassword: OLD,
      newPassword: NEW,
    });

    expect(codeOf(sixth)).toBe('ACCOUNT_LOCKED');
    expect(await hashOf(userId)).toBe(before);
  });

  it('[RNF-SEG-04] token de outra pessoa ou inexistente → UNAUTHENTICATED e nada muda', async () => {
    const victim = await seed(1);
    const attacker = await seed(1);
    const before = await hashOf(victim.userId);

    const withOthersToken = await changePassword(changeDeps(), {
      userId: victim.userId,
      sessionToken: attacker.tokens[0]!,
      currentPassword: OLD,
      newPassword: NEW,
    });
    const withBogusToken = await changePassword(changeDeps(), {
      userId: victim.userId,
      sessionToken: 'token-inexistente',
      currentPassword: OLD,
      newPassword: NEW,
    });

    expect(codeOf(withOthersToken)).toBe('UNAUTHENTICATED');
    expect(codeOf(withBogusToken)).toBe('UNAUTHENTICATED');
    expect(await hashOf(victim.userId)).toBe(before);
  });

  it('[RN-ACE-04] a troca bem-sucedida zera falhas parciais de senha', async () => {
    const { email, userId, tokens } = await seed(1);
    await login(loginDeps(), { email, password: 'errada-1234567' });
    await login(loginDeps(), { email, password: 'errada-1234567' });

    await changePassword(changeDeps(), { userId, sessionToken: tokens[0]!, currentPassword: OLD, newPassword: NEW });

    const [user] = await kit.owner<{ failed_attempts: number }>('SELECT failed_attempts FROM users WHERE id = $1', [userId]);
    expect(user?.failed_attempts).toBe(0);
  });

  it('[RN-ACE-02] se a auditoria falha, NADA é trocado: o hash antigo e as outras sessões continuam (mesma transação)', async () => {
    const { userId, tokens } = await seed(2);
    const before = await hashOf(userId);
    const failingAudit = new PrismaUnitOfWork(kit.db, {
      createAudit: (tx) => {
        const real = new PrismaAuditLog(tx);
        return {
          record: async (entry) => {
            await real.record(entry);
            throw new Error('falha depois de auditar');
          },
        };
      },
    });

    await expect(
      changePassword(changeDeps(failingAudit), {
        userId,
        sessionToken: tokens[0]!,
        currentPassword: OLD,
        newPassword: NEW,
      }),
    ).rejects.toThrow('falha depois de auditar');

    expect(await hashOf(userId)).toBe(before);
    expect(await sessionCount(userId)).toBe(2);
  });
});
