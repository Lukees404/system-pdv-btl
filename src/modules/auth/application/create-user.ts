import { recordAudit } from '@/modules/audit';
import type { Clock } from '@/shared/clock';
import { DomainError } from '@/shared/errors';
import type { IdGenerator } from '@/shared/ids';
import { err, ok, type Result } from '@/shared/result';
import { normalizeEmail } from '../domain/email';
import { validateName } from '../domain/name';
import { validatePassword } from '../domain/password-policy';
import { DuplicateEmailError, type PasswordHasher, type UnitOfWork } from './ports';

export type CreateUserDeps = {
  uow: UnitOfWork;
  hasher: PasswordHasher;
  clock: Clock;
  ids: IdGenerator;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  /** Quem cria (`null`/ausente = script do desenvolvedor). */
  createdByUserId?: string | null;
};

/**
 * Cria um usuário `OWNER` (RF-AUT-04, RN-ACE-06). Só o script do desenvolvedor chama isto:
 * não existe autocadastro. A auditoria (`user.created`) entra na mesma transação e guarda
 * só IDs, nunca nome nem e-mail (RN-ACE-03).
 */
export async function createUser(
  deps: CreateUserDeps,
  input: CreateUserInput,
): Promise<Result<{ id: string }>> {
  const email = normalizeEmail(input.email);
  if (!email.ok) return email;
  const name = validateName(input.name);
  if (!name.ok) return name;
  const password = validatePassword(input.password);
  if (!password.ok) return password;

  const passwordHash = await deps.hasher.hash(input.password);
  const id = deps.ids.next();
  const now = deps.clock.now();

  try {
    await deps.uow.run(async ({ users, audit }) => {
      await users.create({
        id,
        name: name.value,
        email: email.value,
        passwordHash,
        createdAt: now,
      });
      await recordAudit(
        { log: audit, clock: deps.clock },
        {
          userId: input.createdByUserId ?? null,
          action: 'user.created',
          entityType: 'user',
          entityId: id,
          data: { role: 'OWNER' },
        },
      );
    });
  } catch (error) {
    if (error instanceof DuplicateEmailError) return err(new DomainError('EMAIL_TAKEN'));
    throw error;
  }

  return ok({ id });
}
