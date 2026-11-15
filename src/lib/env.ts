import { z } from 'zod';
import { DomainError } from '@/shared/errors';

const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\/.+/, 'deve ser uma URL de conexão PostgreSQL');

/**
 * Esquema das variáveis de ambiente (RNF-OPS-03). `DATABASE_URL` é a conexão da
 * aplicação (usuário só com DML, via pooler em produção); `DIRECT_URL` é a conexão
 * direta usada nas migrações (dono do schema).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: postgresUrl,
  // Credencial do dono do schema: só o CLI de migração a usa (prisma.config.ts). Opcional
  // aqui para que o ambiente do servidor em produção não precise carregá-la (RNF-SEG-07).
  DIRECT_URL: postgresUrl.optional(),
  TEST_DATABASE_URL: postgresUrl.optional(),
  TEST_DIRECT_URL: postgresUrl.optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Nomes de todas as variáveis conhecidas (usado para conferir o `.env.example`). */
export const ENV_KEYS = Object.keys(envSchema.shape);

/**
 * Valida uma fonte de variáveis (normalmente `process.env`).
 * Em caso de erro, o `DomainError` lista apenas os NOMES das variáveis problemáticas:
 * nunca o valor, que pode conter senha (RNF-SEG-06, RNF-SEG-10).
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const variables = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
  throw new DomainError('INVALID_ENV', { variables });
}

let cached: Env | undefined;

/**
 * Único lugar do sistema que lê `process.env` (regra de lint). Validação preguiçosa:
 * só acontece no primeiro uso, para o `next build` não exigir banco configurado.
 */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/**
 * Só `NODE_ENV`, sem validar o resto: o `proxy.ts` roda em toda requisição e não pode falhar
 * (nem exigir banco) por causa de outra variável.
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}
