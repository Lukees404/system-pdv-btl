import type { DomainError } from '../errors';

/**
 * Resultado tipado de um caso de uso (ADR-012): erro esperado é um valor
 * (`Err`), não uma exceção. Exceção fica para falha inesperada.
 */
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E extends DomainError = DomainError> = { readonly ok: false; readonly error: E };
export type Result<T, E extends DomainError = DomainError> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E extends DomainError>(error: E): Err<E> {
  return { ok: false, error };
}

export function isOk<T, E extends DomainError>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

export function isErr<T, E extends DomainError>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

export function map<T, U, E extends DomainError>(
  result: Result<T, E>,
  transform: (value: T) => U,
): Result<U, E> {
  return result.ok ? ok(transform(result.value)) : result;
}

/** Extrai o valor; num `Err`, lança o próprio erro de domínio. Útil em testes e scripts. */
export function unwrap<T, E extends DomainError>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}
