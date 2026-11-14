import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import { err, isErr, isOk, map, ok, unwrap } from './index';

describe('Result', () => {
  it('[ADR-012] ok() carrega o valor e isOk/isErr distinguem os casos', () => {
    const result = ok(42);

    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it('[ADR-012] err() carrega um DomainError com code estável', () => {
    const result = err(new DomainError('INVALID_MONEY', { value: 1.5 }));

    expect(isErr(result)).toBe(true);
    expect(isOk(result)).toBe(false);
    expect(isErr(result) && result.error.code).toBe('INVALID_MONEY');
  });

  it('[ADR-012] map transforma o valor de um Ok e deixa o Err intacto', () => {
    expect(map(ok(2), (n) => n * 10)).toEqual({ ok: true, value: 20 });

    const failure = err(new DomainError('INVALID_QUANTITY'));
    expect(map(failure, (n: number) => n * 10)).toBe(failure);
  });

  it('[ADR-012] unwrap devolve o valor de um Ok', () => {
    expect(unwrap(ok('pronto'))).toBe('pronto');
  });

  it('[ADR-012] unwrap lança o próprio DomainError quando é Err', () => {
    const error = new DomainError('INVALID_PERCENT');

    expect(() => unwrap(err(error))).toThrow(error);
  });
});
