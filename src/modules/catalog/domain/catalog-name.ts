import { normalizeText } from '@/shared/text';

export type CatalogName = { name: string; nameNormalized: string };

/**
 * Nome de produto, serviço ou categoria: sem espaços nas pontas, de 1 a `max` caracteres
 * (conta caracteres Unicode, como o `char_length` do banco) e não vazio depois de normalizado
 * (o `name_normalized` tem CHECK de não vazio). Devolve `null` se for inválido; quem chama
 * escolhe o código de erro (cada tipo tem o seu limite e a sua mensagem).
 */
export function parseCatalogName(raw: string, max: number): CatalogName | null {
  const name = raw.trim();
  const length = [...name].length;
  if (length < 1 || length > max) return null;

  const nameNormalized = normalizeText(name);
  return nameNormalized === '' ? null : { name, nameNormalized };
}
