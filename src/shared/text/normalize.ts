/**
 * Normaliza texto para comparar e buscar (ADR-020): minúsculas, sem acento e com espaços
 * colapsados. É a ÚNICA regra de normalização do sistema: o que vai para `name_normalized`
 * e o termo digitado na busca passam por aqui, então nunca divergem.
 *
 * A ordem importa: minúsculas ANTES de decompor (algumas letras, como "İ", geram marcas ao
 * minusculizar) e remoção das marcas combinantes DEPOIS de decompor (NFD separa "ç" em
 * "c" + cedilha). Pontuação e dígitos ficam: medidas e códigos continuam buscáveis.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}
