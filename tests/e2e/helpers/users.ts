import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';

const run = promisify(execFile);

export type E2eUser = { name: string; email: string; password: string };

/**
 * Cria um usuário só para um teste, pelo caso de uso real (RF-AUT-04), num processo `tsx`
 * separado. Cada teste tem o seu, para que bloqueio ou troca de senha de um não afete os
 * outros. Os usuários `e2e-*@example.test` ficam no banco de desenvolvimento/CI; as senhas
 * são valores de teste gerados aqui.
 */
export async function createE2eUser(): Promise<E2eUser> {
  const user: E2eUser = {
    name: 'Pessoa de Teste',
    email: `e2e-${randomUUID()}@example.test`,
    password: `senha-${randomUUID()}`,
  };

  await run(process.execPath, ['--import', 'tsx', 'tests/e2e/helpers/create-user-process.ts'], {
    env: {
      ...process.env,
      E2E_NAME: user.name,
      E2E_EMAIL: user.email,
      E2E_PASSWORD: user.password,
    },
  });
  return user;
}
