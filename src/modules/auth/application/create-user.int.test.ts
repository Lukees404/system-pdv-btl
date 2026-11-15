import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaAuditLog } from '@/modules/audit';
import { createAuthTestKit, type AuthTestKit } from '../test-support';
import { PrismaUnitOfWork } from '../infrastructure/prisma-unit-of-work';
import { createUser } from './create-user';

describe('createUser (banco real)', () => {
  let kit: AuthTestKit;
  const deps = () => ({ uow: kit.uow, hasher: kit.hasher, clock: kit.clock, ids: kit.ids });

  beforeAll(async () => {
    kit = await createAuthTestKit();
  }, 90_000);
  afterAll(async () => {
    await kit.close();
  });

  const countUsers = async (email: string) =>
    (await kit.owner('SELECT 1 FROM users WHERE email = $1', [email])).length;

  it('[RF-AUT-04][RN-ACE-06] cria um OWNER ativo, com e-mail normalizado e senha com hash (nunca em claro)', async () => {
    const result = await createUser(
      { ...deps(), hasher: kit.realHasher },
      { name: 'Maria Silva', email: '  Novo@Exemplo.COM ', password: 'senha-bem-longa-1' },
    );

    expect(result.ok).toBe(true);
    const [row] = await kit.owner<{
      id: string;
      email: string;
      role: string;
      active: boolean;
      password_hash: string;
      failed_attempts: number;
    }>('SELECT id, email, role, active, password_hash, failed_attempts FROM users WHERE email = $1', [
      'novo@exemplo.com',
    ]);
    expect(row).toMatchObject({ email: 'novo@exemplo.com', role: 'OWNER', active: true, failed_attempts: 0 });
    expect(row?.password_hash).toMatch(/^\$argon2id\$/);
    expect(row?.password_hash).not.toContain('senha-bem-longa-1');
    expect(result.ok && result.value.id).toBe(row?.id);
  });

  it('[RN-ACE-02][RN-ACE-03] grava a auditoria user.created só com IDs, sem nome nem e-mail', async () => {
    const result = await createUser(deps(), {
      name: 'Joana Auditada',
      email: 'auditada@exemplo.com',
      password: 'senha-bem-longa-2',
    });

    const id = result.ok ? result.value.id : '';
    const [audit] = await kit.owner<{ action: string; entity_type: string; entity_id: string; user_id: string | null; data: unknown }>(
      "SELECT action, entity_type, entity_id, user_id, data FROM audit_log WHERE action = 'user.created' AND entity_id = $1",
      [id],
    );
    expect(audit).toMatchObject({ action: 'user.created', entity_type: 'user', entity_id: id, user_id: null });
    const serialized = JSON.stringify(audit);
    expect(serialized).not.toContain('auditada@exemplo.com');
    expect(serialized).not.toContain('Joana');
  });

  it('[RN-ACE-02] registra quem criou o usuário quando informado', async () => {
    const creator = await createUser(deps(), {
      name: 'Criador',
      email: 'criador@exemplo.com',
      password: 'senha-bem-longa-3',
    });
    const creatorId = creator.ok ? creator.value.id : '';

    const created = await createUser(deps(), {
      name: 'Criado',
      email: 'criado@exemplo.com',
      password: 'senha-bem-longa-4',
      createdByUserId: creatorId,
    });

    const [audit] = await kit.owner<{ user_id: string }>(
      "SELECT user_id FROM audit_log WHERE action = 'user.created' AND entity_id = $1",
      [created.ok ? created.value.id : ''],
    );
    expect(audit?.user_id).toBe(creatorId);
  });

  it('[RN-ACE-01] e-mail repetido (mesmo com maiúsculas ou espaços) → EMAIL_TAKEN, sem segundo usuário nem auditoria', async () => {
    await createUser(deps(), { name: 'Primeiro', email: 'repetido@exemplo.com', password: 'senha-bem-longa-5' });
    const auditsBefore = (await kit.owner("SELECT 1 FROM audit_log WHERE action = 'user.created'")).length;

    const again = await createUser(deps(), {
      name: 'Segundo',
      email: '  REPETIDO@exemplo.com ',
      password: 'senha-bem-longa-6',
    });

    expect(!again.ok && again.error.code).toBe('EMAIL_TAKEN');
    expect(await countUsers('repetido@exemplo.com')).toBe(1);
    expect((await kit.owner("SELECT 1 FROM audit_log WHERE action = 'user.created'")).length).toBe(auditsBefore);
  });

  it('[RN-ACE-01] duas criações simultâneas com o mesmo e-mail: exatamente uma vence, a outra recebe EMAIL_TAKEN', async () => {
    const attempt = (name: string) =>
      createUser(deps(), { name, email: 'corrida@exemplo.com', password: 'senha-bem-longa-7' });

    const results = await Promise.all([attempt('A'), attempt('B')]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.error.code === 'EMAIL_TAKEN')).toHaveLength(1);
    expect(await countUsers('corrida@exemplo.com')).toBe(1);
  });

  it.each([
    ['senha curta', { name: 'A', email: 'fraca@exemplo.com', password: 'curta' }, 'WEAK_PASSWORD'],
    ['e-mail inválido', { name: 'A', email: 'sem-arroba', password: 'senha-bem-longa-8' }, 'INVALID_EMAIL'],
    ['nome vazio', { name: '   ', email: 'semnome@exemplo.com', password: 'senha-bem-longa-9' }, 'INVALID_NAME'],
    ['nome longo demais', { name: 'x'.repeat(101), email: 'longo@exemplo.com', password: 'senha-bem-longa-10' }, 'INVALID_NAME'],
  ])('[RF-AUT-04] %s é recusado e nada é gravado', async (_label, input, code) => {
    const result = await createUser(deps(), input);

    expect(!result.ok && result.error.code).toBe(code);
    expect(await countUsers(input.email.trim().toLowerCase())).toBe(0);
  });

  it('[RN-ACE-02] se a auditoria falha, o usuário NÃO é criado (mesma transação)', async () => {
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
      createUser(
        { ...deps(), uow: failingAudit },
        { name: 'Atomico', email: 'atomico@exemplo.com', password: 'senha-bem-longa-11' },
      ),
    ).rejects.toThrow('falha depois de auditar');

    expect(await countUsers('atomico@exemplo.com')).toBe(0);
  });
});
