import type { AuditLog } from '@/modules/audit';

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  active: boolean;
  failedAttempts: number;
  lockedUntil: Date | null;
};

export type NewUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

/** Lançado pelo repositório quando o e-mail já existe (índice único); desfaz a transação. */
export class DuplicateEmailError extends Error {
  constructor() {
    super('DUPLICATE_EMAIL');
    this.name = 'DuplicateEmailError';
  }
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  /** Cria um `OWNER` ativo. Lança `DuplicateEmailError` se o e-mail já existir. */
  create(user: NewUser): Promise<void>;
  /**
   * Soma 1 ao contador de falhas de forma ATÔMICA no banco e devolve o novo valor.
   * Duas tentativas simultâneas nunca recebem o mesmo número (RNF-SEG-03).
   */
  registerFailure(userId: string, now: Date): Promise<number>;
  /** Bloqueia até `until`, sem nunca ENCURTAR um bloqueio que já esteja maior. */
  lockUntil(userId: string, until: Date, now: Date): Promise<void>;
  /** Zera as falhas e o bloqueio (login correto). */
  resetFailures(userId: string, now: Date): Promise<void>;
}

export type NewSession = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
};

export interface SessionRepository {
  create(session: NewSession): Promise<void>;
}

/** Repositórios e auditoria ligados à MESMA transação do banco. */
export type UnitOfWorkContext = {
  users: UserRepository;
  sessions: SessionRepository;
  audit: AuditLog;
};

export interface UnitOfWork {
  /** Roda `work` numa transação: tudo é gravado junto (commit) ou nada (se `work` lançar). */
  run<T>(work: (context: UnitOfWorkContext) => Promise<T>): Promise<T>;
}

/**
 * Portas de segredos da autenticação. O hash de senha é caro de propósito; atrás de uma
 * porta, os casos de uso rodam nos testes com um hasher falso e instantâneo.
 */
export interface PasswordHasher {
  /** Hash com sal aleatório; o resultado nunca contém a senha. */
  hash(password: string): Promise<string>;
  /** `false` para senha errada OU hash inválido; nunca lança por causa do conteúdo. */
  verify(hash: string, password: string): Promise<boolean>;
}

export interface SessionTokens {
  /** Token de sessão aleatório (vai só para o cookie do navegador). */
  generate(): string;
  /** Hash determinístico do token: é o que o banco guarda (`sessions.token_hash`). */
  hash(token: string): string;
}
