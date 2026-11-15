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
