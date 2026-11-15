import { DomainError } from '../errors';
import { err, ok, type Result } from '../result';
import { money, type Money } from './money';

// Só dígitos com milhar em grupos de 3 (`1.234.567`) ou sem milhar (`1234`), e até 2 casas
// decimais depois da vírgula. O ponto NUNCA é decimal: `12.50` é ambíguo (formato em inglês)
// e vira erro em vez de virar R$ 1.250,00 sem ninguém perceber.
const AMOUNT = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;
// Limite de sanidade para um preço: até 10 dígitos de reais (bem abaixo do inteiro seguro).
const MAX_REAIS_DIGITS = 10;

/**
 * Converte o que a pessoa digitou (`12,50`, `R$ 12,50`, `1.234,56`) em centavos inteiros
 * (RN-DIN-01): lê os dígitos como texto, sem ponto flutuante. Não aceita negativo (preço e
 * custo são ≥ 0) nem texto vazio: quem tem campo opcional decide antes de chamar.
 */
export function parseMoneyInput(input: string): Result<Money> {
  const invalid = () => err(new DomainError('INVALID_MONEY', { reason: 'unparseable-input' }));

  const text = input
    .replace(/ /g, ' ')
    .trim()
    .replace(/^r\$\s*/i, '');
  const match = AMOUNT.exec(text);
  if (!match) return invalid();

  const reais = (match[1] ?? '').replace(/\./g, '');
  if (reais.length > MAX_REAIS_DIGITS) return invalid();

  const cents = (match[2] ?? '').padEnd(2, '0');
  return ok(money(Number(reais) * 100 + Number(cents)));
}
