import type { SessionTokens, UnitOfWork } from './ports';

export type LogoutDeps = { uow: UnitOfWork; tokens: SessionTokens };

/** Sair (RF-AUT-02): apaga a sessão NO SERVIDOR, então o token deixa de valer mesmo se alguém o copiou. Idempotente. */
export async function logout(deps: LogoutDeps, token: string): Promise<void> {
  if (token === '') return;
  const tokenHash = deps.tokens.hash(token);

  await deps.uow.run(({ sessions }) => sessions.deleteByTokenHash(tokenHash));
}
