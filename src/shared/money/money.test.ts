import { describe, expect, it } from 'vitest';
import { add, allocate, formatBRL, money, percentOf, subtract, sum, times } from './index';

const code = (c: string) => expect.objectContaining({ code: c });

describe('money()', () => {
  it('[RN-DIN-01] aceita inteiros em centavos, inclusive zero e negativos', () => {
    expect(money(0)).toBe(0);
    expect(money(1999)).toBe(1999);
    expect(money(-500)).toBe(-500);
  });

  it.each([1.5, 0.1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    '[RN-DIN-01] rejeita valor não inteiro ou fora do inteiro seguro: %s',
    (value) => {
      expect(() => money(value)).toThrow(code('INVALID_MONEY'));
    },
  );
});

describe('add / subtract / sum', () => {
  it('[RN-DIN-01] somam e subtraem exatamente em centavos', () => {
    expect(add(money(1050), money(250))).toBe(1300);
    expect(subtract(money(1000), money(1250))).toBe(-250);
    expect(sum([money(10), money(20), money(30)])).toBe(60);
    expect(sum([])).toBe(0);
  });

  it('[RN-DIN-01] estourar o inteiro seguro vira erro, nunca valor silencioso', () => {
    const max = money(Number.MAX_SAFE_INTEGER);

    expect(() => add(max, money(1))).toThrow(code('INVALID_MONEY'));
    expect(() => subtract(money(-Number.MAX_SAFE_INTEGER), money(1))).toThrow(
      code('INVALID_MONEY'),
    );
    expect(() => sum([max, money(1)])).toThrow(code('INVALID_MONEY'));
  });
});

describe('times()', () => {
  it('[RN-DIN-03] multiplica o preço por uma quantidade inteira ≥ 1', () => {
    expect(times(money(1999), 3)).toBe(5997);
    expect(times(money(1999), 1)).toBe(1999);
  });

  it.each([0, -1, 1.5, Number.NaN])(
    '[RN-DIN-03] rejeita quantidade que não seja inteira ≥ 1: %s',
    (qty) => {
      expect(() => times(money(100), qty)).toThrow(code('INVALID_QUANTITY'));
    },
  );

  it('[RN-DIN-01] resultado fora do inteiro seguro vira erro', () => {
    expect(() => times(money(Number.MAX_SAFE_INTEGER), 2)).toThrow(code('INVALID_MONEY'));
  });
});

describe('percentOf()', () => {
  it('[RN-DIN-02] 1.999 × 10% = 200 (half-up, exemplo do doc 07)', () => {
    expect(percentOf(money(1999), 10)).toBe(200);
  });

  it.each([
    [5, 10, 1], // 0,5 → 1
    [15, 10, 2], // 1,5 → 2
    [25, 10, 3], // 2,5 → 3 (half-up, não arredondamento bancário)
    [14, 10, 1], // 1,4 → 1
    [16, 10, 2], // 1,6 → 2
  ])('[RN-DIN-02] %i centavos com %i por cento de desconto = %i', (subtotal, pct, expected) => {
    expect(percentOf(money(subtotal), pct)).toBe(expected);
  });

  it('[RN-DIN-02] 0% dá zero e 100% dá o subtotal', () => {
    expect(percentOf(money(12345), 0)).toBe(0);
    expect(percentOf(money(12345), 100)).toBe(12345);
  });

  it('[RN-DIN-02] aceita até 2 casas decimais no percentual', () => {
    expect(percentOf(money(10000), 12.5)).toBe(1250);
    expect(percentOf(money(1999), 0.01)).toBe(0); // 0,1999 → 0
    expect(percentOf(money(5000), 0.01)).toBe(1); // 0,5 → 1
  });

  it.each([-1, 100.01, 101, 10.123, Number.NaN, Number.POSITIVE_INFINITY])(
    '[RN-DIN-02] rejeita percentual fora de 0–100 ou com mais de 2 casas: %s',
    (pct) => {
      expect(() => percentOf(money(1000), pct)).toThrow(code('INVALID_PERCENT'));
    },
  );

  it('[RN-DIN-02] rejeita subtotal negativo', () => {
    expect(() => percentOf(money(-1), 10)).toThrow(code('INVALID_MONEY'));
  });

  it('[RN-DIN-01] não perde precisão com valores muito grandes', () => {
    // 9.007.199.254.740.991 × 50% = 4.503.599.627.370.495,5 → 4.503.599.627.370.496
    expect(percentOf(money(Number.MAX_SAFE_INTEGER), 50)).toBe(4503599627370496);
  });
});

describe('allocate()', () => {
  it('[RN-DIN-05] a soma das partes é exatamente o total (maior resto)', () => {
    // 100 / 3 pesos iguais: 33,33,33 + 1 centavo sobra para o primeiro
    expect(allocate(money(100), [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it('[RN-DIN-05] rateia proporcionalmente aos pesos', () => {
    // 10 centavos entre 3 itens de 100, 200 e 700: 1, 2, 7
    expect(allocate(money(10), [100, 200, 700])).toEqual([1, 2, 7]);
  });

  it('[RN-DIN-05] a sobra vai para o maior resto, não para o primeiro item', () => {
    // 7 centavos × [3,3,4]/10 = 2,1 / 2,1 / 2,8: sobra 1 centavo e o maior resto (0,8) é do 3º
    expect(allocate(money(7), [3, 3, 4])).toEqual([2, 2, 3]);
  });

  it('[RN-DIN-05] empate de resto é decidido pelo menor índice (determinístico)', () => {
    expect(allocate(money(2), [1, 1, 1])).toEqual([1, 1, 0]);
    expect(allocate(money(2), [1, 1, 1])).toEqual([1, 1, 0]);
  });

  it('[RN-DIN-05] peso zero recebe zero; total zero dá tudo zero', () => {
    expect(allocate(money(10), [0, 1, 1])).toEqual([0, 5, 5]);
    expect(allocate(money(0), [3, 4])).toEqual([0, 0]);
  });

  it('[RN-DIN-05] um único item recebe o total', () => {
    expect(allocate(money(999), [42])).toEqual([999]);
  });

  it.each([
    ['lista vazia', 10, []],
    ['todos os pesos zero', 10, [0, 0]],
    ['peso negativo', 10, [1, -1]],
    ['peso fracionário', 10, [1, 0.5]],
    ['total negativo', -10, [1, 1]],
  ])('[RN-DIN-05] rejeita %s', (_name, total, weights) => {
    expect(() => allocate(money(total), weights)).toThrow(code('INVALID_ALLOCATION'));
  });
});

describe('formatBRL()', () => {
  it.each([
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [100, 'R$ 1,00'],
    [123456, 'R$ 1.234,56'],
    [123456789, 'R$ 1.234.567,89'],
    [-100, '-R$ 1,00'],
    [-5, '-R$ 0,05'],
  ])('[RN-DIN-01] formata %i centavos como "%s"', (cents, expected) => {
    expect(formatBRL(money(cents))).toBe(expected);
  });

  it('[RN-DIN-01] usa espaço comum, não espaço não separável (NBSP)', () => {
    expect(formatBRL(money(100))).not.toContain(' ');
  });
});
