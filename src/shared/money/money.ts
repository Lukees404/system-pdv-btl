import { DomainError } from '../errors';

declare const moneyBrand: unique symbol;

/**
 * Dinheiro em CENTAVOS, sempre um inteiro seguro (RN-DIN-01, ADR-006).
 * O "brand" impede passar um `number` qualquer onde se espera dinheiro: só `money()`
 * (que valida) fabrica o tipo.
 */
export type Money = number & { readonly [moneyBrand]: true };

export function money(cents: number): Money {
  if (!Number.isSafeInteger(cents)) {
    throw new DomainError('INVALID_MONEY', { value: cents });
  }
  return cents as Money;
}

export function add(a: Money, b: Money): Money {
  return money(a + b);
}

export function subtract(a: Money, b: Money): Money {
  return money(a - b);
}

export function sum(values: readonly Money[]): Money {
  return values.reduce<Money>((acc, value) => add(acc, value), money(0));
}

/** Preço × quantidade. Quantidade é inteira e ≥ 1 (RN-DIN-03). */
export function times(price: Money, quantity: number): Money {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new DomainError('INVALID_QUANTITY', { value: quantity });
  }
  return money(price * quantity);
}

/**
 * Percentual de um valor, arredondado half-up em centavos (RN-DIN-02).
 * O percentual aceita até 2 casas decimais (ex.: 12,5) e é convertido para
 * pontos-base inteiros; a conta usa BigInt para não perder precisão nem estourar.
 */
export function percentOf(subtotal: Money, percent: number): Money {
  if (subtotal < 0) {
    throw new DomainError('INVALID_MONEY', { value: subtotal, reason: 'negative-base' });
  }

  const basisPoints = Math.round(percent * 100);
  const isValid =
    Number.isFinite(percent) &&
    percent >= 0 &&
    percent <= 100 &&
    Math.abs(percent * 100 - basisPoints) < 1e-7;
  if (!isValid) {
    throw new DomainError('INVALID_PERCENT', { value: percent });
  }

  // half-up: floor(x * bp / 10000 + 1/2) = floor((2 * x * bp + 10000) / 20000)
  const result = (BigInt(subtotal) * BigInt(basisPoints) * 2n + 10_000n) / 20_000n;
  return money(Number(result));
}
