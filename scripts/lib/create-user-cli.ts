// Parte pura do `pnpm create-user` (testável sem terminal nem banco).

export type CreateUserArgs = { name?: string; email?: string };
export type ParseResult = { ok: true; value: CreateUserArgs } | { ok: false; message: string };

const PASSWORD_FLAGS = new Set(['--password', '-p']);
const VALUE_FLAGS = new Set(['--name', '--email']);

/**
 * Lê `--name` e `--email`. A senha NUNCA vem por argumento: ficaria no histórico do shell e na
 * lista de processos (RNF-SEG-06); o script a pede com entrada oculta.
 */
export function parseCreateUserArgs(argv: readonly string[]): ParseResult {
  const value: CreateUserArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const [flag = '', inline] = (argv[i] ?? '').split(/=(.*)/s, 2);
    if (PASSWORD_FLAGS.has(flag)) {
      return {
        ok: false,
        message: 'A senha não é aceita como argumento: ela é pedida com entrada oculta.',
      };
    }
    if (!VALUE_FLAGS.has(flag)) {
      return { ok: false, message: `Argumento desconhecido: ${flag}. Use --name e --email.` };
    }
    const next = inline ?? argv[(i += 1)];
    if (next === undefined) return { ok: false, message: `Falta o valor de ${flag}.` };
    value[flag === '--name' ? 'name' : 'email'] = next;
  }
  return { ok: true, value };
}

export function checkPasswordConfirmation(password: string, confirmation: string): boolean {
  return password.length > 0 && password === confirmation;
}
