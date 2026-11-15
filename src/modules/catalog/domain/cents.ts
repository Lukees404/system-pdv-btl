/** Dinheiro em centavos (RN-DIN-01): inteiro seguro e não negativo. Preço e custo são ≥ 0. */
export function isNonNegativeCents(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
