import { SystemClock, type Clock } from '@/shared/clock';
import { DomainError } from '@/shared/errors';
import { getEnv } from './env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  /** Novo logger que acrescenta `context` (ex.: requestId, userId) a toda linha. */
  child(context: LogFields): Logger;
}

export type LoggerOptions = {
  clock: Clock;
  level: LogLevel;
  /** Recebe uma linha JSON pronta. Injetável para testar sem tocar no console. */
  write: (line: string) => void;
  context?: LogFields;
};

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const CORE_KEYS = new Set(['time', 'level', 'msg']);
const REDACTED = '[REDACTED]';
const MAX_DEPTH = 10;

// Dados pessoais e segredos (RNF-LGPD-05, RNF-SEG-06). A chave é normalizada
// (minúscula, sem separadores) e depois comparada.
const EXACT_PII_KEYS = new Set([
  'name',
  'firstname',
  'lastname',
  'fullname',
  'customername',
  'tutorname',
  'username',
  'petname',
]);
const PII_KEY_PARTS = [
  'cpf',
  'phone',
  'telefone',
  'address',
  'endereco',
  'email',
  'password',
  'senha',
  'token',
  'authorization',
  'cookie',
  'secret',
  'databaseurl',
  'directurl',
  'apikey',
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return EXACT_PII_KEYS.has(normalized) || PII_KEY_PARTS.some((part) => normalized.includes(part));
}

/** Remove a senha de URLs de conexão que apareçam dentro de qualquer texto. */
function scrubText(text: string): string {
  return text.replace(/(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s]+@/gi, `$1${REDACTED}@`);
}

function serializeError(error: Error, path: object[], depth: number): Record<string, unknown> {
  if (error instanceof DomainError) {
    return {
      name: error.name,
      code: error.code,
      details: sanitize(error.details, path, depth + 1),
    };
  }
  // Erros de driver/rede (pg, Prisma, Node) trazem o motivo real em `code` e em `cause`.
  const code = (error as { code?: unknown }).code;
  return {
    name: error.name,
    message: scrubText(error.message),
    ...(typeof code === 'string' ? { code } : {}),
    ...(error.cause !== undefined ? { cause: sanitize(error.cause, path, depth + 1) } : {}),
    ...(error.stack ? { stack: scrubText(error.stack) } : {}),
  };
}

function sanitize(value: unknown, ancestors: object[], depth: number): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (typeof value === 'bigint') return value.toString();
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (ancestors.includes(value)) return '[Circular]';
  if (depth > MAX_DEPTH) return '[MaxDepth]';

  const path = [...ancestors, value];
  if (value instanceof Error) return serializeError(value, path, depth);
  if (Array.isArray(value)) return value.map((item) => sanitize(item, path, depth + 1));

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? REDACTED : sanitize(item, path, depth + 1),
    ]),
  );
}

let appLogger: Logger | undefined;

/**
 * Nível de log do ambiente. Se a configuração estiver inválida, usa `info`: o logger é
 * justamente o que precisa funcionar para dizer QUAL variável está errada; ele não pode
 * ser a primeira coisa a quebrar.
 */
function configuredLevel(): LogLevel {
  try {
    return getEnv().LOG_LEVEL;
  } catch (error) {
    if (error instanceof DomainError && error.code === 'INVALID_ENV') return 'info';
    throw error;
  }
}

/** Logger da aplicação: relógio do sistema, `LOG_LEVEL` do ambiente, saída no console. */
export function getLogger(): Logger {
  appLogger ??= createLogger({
    clock: new SystemClock(),
    level: configuredLevel(),
    write: (line) => console.log(line),
  });
  return appLogger;
}

export function createLogger(options: LoggerOptions): Logger {
  const { clock, level: minimum, write, context = {} } = options;

  function log(level: LogLevel, msg: string, fields: LogFields = {}): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[minimum]) return;

    const extras = sanitize({ ...context, ...fields }, [], 0) as Record<string, unknown>;
    const entry: Record<string, unknown> = {
      time: clock.now().toISOString(),
      level,
      msg: scrubText(msg),
    };
    for (const [key, value] of Object.entries(extras)) {
      // Campos do chamador nunca sobrescrevem time/level/msg.
      if (!CORE_KEYS.has(key)) entry[key] = value;
    }
    write(JSON.stringify(entry));
  }

  return {
    debug: (msg, fields) => log('debug', msg, fields),
    info: (msg, fields) => log('info', msg, fields),
    warn: (msg, fields) => log('warn', msg, fields),
    error: (msg, fields) => log('error', msg, fields),
    child: (extra) => createLogger({ ...options, context: { ...context, ...extra } }),
  };
}
