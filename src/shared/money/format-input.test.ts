import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatMoneyInput, money, parseMoneyInput } from './index';

describe('formatMoneyInput()', () => {
  it.each([
    [0, '0,00'],
    [5, '0,05'],
    [1250, '12,50'],
    [123456, '1234,56'],
  ])('[RN-DIN-01] %i centavos viram "%s" (sem R$ e sem milhar, para reeditar no campo)', (c, s) => {
    expect(formatMoneyInput(money(c))).toBe(s);
  });

  it('[RN-DIN-01] ida e volta: o texto formatado volta aos mesmos centavos', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 9_999_999_999 }), (cents) => {
        const parsed = parseMoneyInput(formatMoneyInput(money(cents)));
        expect(parsed.ok && parsed.value).toBe(cents);
      }),
    );
  });
});
