import { DomainError } from '../errors';
import { money, type Money } from './money';

/**
 * Rateia `total` entre itens proporcionalmente aos `weights` pelo método do maior
 * resto (RN-DIN-05): cada item recebe a parte inteira da sua cota e os centavos
 * que sobram vão, um a um, para os maiores restos. Empate: menor índice vence,
 * para o resultado ser sempre o mesmo para a mesma entrada.
 */
export function allocate(total: Money, weights: readonly number[]): Money[] {
  const invalid = (reason: string): DomainError =>
    new DomainError('INVALID_ALLOCATION', { reason });

  if (total < 0) throw invalid('negative-total');
  if (weights.length === 0) throw invalid('no-weights');
  if (weights.some((w) => !Number.isSafeInteger(w) || w < 0)) throw invalid('bad-weight');

  const bigWeights = weights.map((w) => BigInt(w));
  const weightSum = bigWeights.reduce((acc, w) => acc + w, 0n);
  if (weightSum === 0n) throw invalid('zero-weights');

  const bigTotal = BigInt(total);
  const shares = bigWeights.map((w) => {
    const scaled = bigTotal * w;
    return { floor: scaled / weightSum, remainder: scaled % weightSum };
  });

  const distributed = shares.reduce((acc, s) => acc + s.floor, 0n);
  const leftover = Number(bigTotal - distributed);

  const byLargestRemainder = shares
    .map((share, index) => ({ index, remainder: share.remainder }))
    .sort((a, b) =>
      a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
    )
    .slice(0, leftover)
    .map((entry) => entry.index);
  const getsExtra = new Set(byLargestRemainder);

  return shares.map((share, index) => money(Number(share.floor) + (getsExtra.has(index) ? 1 : 0)));
}
