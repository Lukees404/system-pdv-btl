import { describe, expect, it } from 'vitest';
import { parseMoneyInput } from './index';

const cents = (input: string) => {
  const result = parseMoneyInput(input);
  return result.ok ? result.value : result.error.code;
};

describe('parseMoneyInput', () => {
  it.each([
    ['12,50', 1250],
    ['R$ 12,50', 1250],
    ['R$12,50', 1250],
    ['  r$ 12,50  ', 1250],
    ['1.234,56', 123456],
    ['R$ 1.234.567,89', 123456789],
    ['1234,56', 123456],
    ['12', 1200],
    ['0', 0],
    ['0,00', 0],
    ['0,05', 5],
    ['12,5', 1250],
    ['1.000', 100000],
  ])('[RN-DIN-01] %j vira %i centavos (inteiro, sem ponto flutuante)', (input, expected) => {
    expect(cents(input)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    'abc',
    'R$',
    '-1',
    '-1,50',
    '12,505', // mais de 2 casas decimais
    '12,50,10',
    '12.50', // ambíguo: ponto só vale como separador de milhar (grupos de 3)
    '1.23.456',
    ',50',
    '12,',
    '1 234,56',
    '12,5a',
    '99999999999,99', // grande demais para ser um preço
  ])('[RN-DIN-01] %j é recusado com INVALID_MONEY', (input) => {
    expect(cents(input)).toBe('INVALID_MONEY');
  });

  it('[RN-DIN-01] nunca devolve fração de centavo nem NaN', () => {
    for (const input of ['0,1', '0,10', '19,99', '0,07']) {
      const value = cents(input);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
