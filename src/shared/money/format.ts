import type { Money } from './money';

/**
 * Formata centavos como `R$ 1.234,56` (RNF-USA-03). Implementação própria, sem `Intl`:
 * o `Intl` usa espaço não separável (NBSP) e o resultado dependeria do ICU do ambiente.
 */
export function formatBRL(value: Money): string {
  const absolute = Math.abs(value);
  const reais = Math.trunc(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cents = (absolute % 100).toString().padStart(2, '0');
  return `${value < 0 ? '-' : ''}R$ ${reais},${cents}`;
}
