import fc from 'fast-check';
import { describe, it } from 'vitest';
import { add, allocate, money, percentOf, subtract } from './index';

const cents = fc.integer({ min: 0, max: 1_000_000_000_000 });
const weights = fc
  .array(fc.integer({ min: 0, max: 1_000_000_000 }), { minLength: 1, maxLength: 20 })
  .filter((list) => list.some((w) => w > 0));

describe('propriedades de dinheiro', () => {
  it('[RN-DIN-05] a soma das partes do rateio é sempre igual ao total', () => {
    fc.assert(
      fc.property(cents, weights, (total, w) => {
        const parts = allocate(money(total), w);
        return parts.reduce((acc, p) => acc + p, 0) === total;
      }),
    );
  });

  it('[RN-DIN-05] cada parte é não negativa e difere da parte exata em menos de 1 centavo', () => {
    fc.assert(
      fc.property(cents, weights, (total, w) => {
        const parts = allocate(money(total), w);
        const weightSum = w.reduce((acc, x) => acc + x, 0);
        return parts.every((part, i) => {
          const exact = (total * (w[i] ?? 0)) / weightSum;
          return part >= 0 && Math.abs(part - exact) < 1 + 1e-6;
        });
      }),
    );
  });

  it('[RN-DIN-05] peso zero nunca recebe centavo', () => {
    fc.assert(
      fc.property(cents, weights, (total, w) => {
        const parts = allocate(money(total), w);
        return parts.every((part, i) => (w[i] === 0 ? part === 0 : true));
      }),
    );
  });

  it('[RN-DIN-05] o rateio é determinístico: mesma entrada, mesma saída', () => {
    fc.assert(
      fc.property(cents, weights, (total, w) => {
        const first = allocate(money(total), w);
        const second = allocate(money(total), w);
        return first.every((part, i) => part === second[i]);
      }),
    );
  });

  it('[RN-DIN-02] o desconto fica entre 0 e o subtotal', () => {
    fc.assert(
      fc.property(cents, fc.integer({ min: 0, max: 10_000 }), (subtotal, bp) => {
        const discount = percentOf(money(subtotal), bp / 100);
        return discount >= 0 && discount <= subtotal;
      }),
    );
  });

  it('[RN-DIN-02] percentual maior nunca dá desconto menor (monotônico)', () => {
    fc.assert(
      fc.property(
        cents,
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (subtotal, a, b) => {
          const [low, high] = a <= b ? [a, b] : [b, a];
          return percentOf(money(subtotal), low / 100) <= percentOf(money(subtotal), high / 100);
        },
      ),
    );
  });

  it('[RN-DIN-02] o desconto difere do valor exato em no máximo meio centavo', () => {
    fc.assert(
      fc.property(cents, fc.integer({ min: 0, max: 10_000 }), (subtotal, bp) => {
        const exactTimes10000 = subtotal * bp; // valor exato × 10.000 (em BigInt seria exato; margem cobre float)
        const discount = percentOf(money(subtotal), bp / 100);
        return Math.abs(discount * 10_000 - exactTimes10000) <= 5_000 + 1;
      }),
    );
  });

  it('[RN-DIN-01] soma é comutativa e subtrair desfaz somar', () => {
    fc.assert(
      fc.property(cents, cents, (a, b) => {
        const x = money(a);
        const y = money(b);
        return add(x, y) === add(y, x) && subtract(add(x, y), y) === x;
      }),
    );
  });
});
