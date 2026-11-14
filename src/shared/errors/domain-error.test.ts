import { describe, expect, it } from 'vitest';
import { DomainError } from './domain-error';

describe('DomainError', () => {
  it('[ADR-012] carrega um code estável e detalhes úteis', () => {
    const error = new DomainError('INVALID_MONEY', { value: 1.5 });

    expect(error.code).toBe('INVALID_MONEY');
    expect(error.details).toEqual({ value: 1.5 });
  });

  it('[ADR-012] é um Error de verdade, com o code na mensagem técnica', () => {
    const error = new DomainError('INVALID_MONEY');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DomainError');
    expect(error.message).toBe('INVALID_MONEY');
  });

  it('[ADR-012] details é opcional e vira objeto vazio', () => {
    expect(new DomainError('INVALID_QUANTITY').details).toEqual({});
  });
});
