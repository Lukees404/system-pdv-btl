import type { Money } from './money';

/**
 * Centavos como texto editável (`12,50`): sem `R$` e sem milhar, para preencher um campo de
 * formulário que `parseMoneyInput` lê de volta aos mesmos centavos. Só para valores ≥ 0.
 */
export function formatMoneyInput(value: Money): string {
  return `${Math.trunc(value / 100)},${(value % 100).toString().padStart(2, '0')}`;
}

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
