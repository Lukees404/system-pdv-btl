import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { createDb } from '@/lib/db';
import { getEnv } from '@/lib/env';
import { Argon2PasswordHasher, PrismaUnitOfWork, createUser } from '@/modules/auth';
import { SystemClock } from '@/shared/clock';
import { errorMessage } from '@/shared/i18n';
import { UuidGenerator } from '@/shared/ids';
import { checkPasswordConfirmation, parseCreateUserArgs } from './lib/create-user-cli';

// Cria um usuário OWNER (RF-AUT-04, RN-ACE-06): o único caminho, não há autocadastro.
// Uso: pnpm create-user [--name "Nome"] [--email e@mail.com]. A senha é sempre pedida com
// entrada oculta. Imprime só o ID: nunca nome, e-mail nem senha (RNF-LGPD-05).
// Em produção, defina DATABASE_URL (usuário pdv_app) só na sessão do terminal.

if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Lê uma linha SEM ecoar (modo raw do terminal). Backspace apaga; Ctrl+C cancela. */
function promptHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) fail('Terminal interativo necessário para digitar a senha com segurança.');

  return new Promise((resolve) => {
    let typed = '';
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          stdout.write('\n');
          resolve(typed);
          return;
        }
        if (char === '\u0003') {
          stdin.setRawMode(false);
          stdout.write('\n');
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') typed = [...typed].slice(0, -1).join('');
        else typed += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function main(): Promise<void> {
  const parsed = parseCreateUserArgs(process.argv.slice(2));
  if (!parsed.ok) fail(parsed.message);

  let { name, email } = parsed.value;
  if (!name || !email) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    name ||= await rl.question('Nome: ');
    email ||= await rl.question('E-mail: ');
    rl.close();
  }

  const password = await promptHidden('Senha (10 a 128 caracteres): ');
  const confirmation = await promptHidden('Repita a senha: ');
  if (!checkPasswordConfirmation(password, confirmation)) fail('As senhas não conferem.');

  const db = createDb(getEnv().DATABASE_URL);
  try {
    const result = await createUser(
      {
        uow: new PrismaUnitOfWork(db),
        hasher: new Argon2PasswordHasher(),
        clock: new SystemClock(),
        ids: new UuidGenerator(),
      },
      { name, email, password },
    );
    if (!result.ok) fail(errorMessage(result.error.code));
    console.log(`Usuário criado. ID: ${result.value.id}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) =>
  fail(error instanceof Error ? error.message : 'Falha inesperada.'),
);
