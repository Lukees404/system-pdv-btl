/**
 * Rastreabilidade regra → teste (docs/07 §7, RNF-MAN-05). Funções puras: a leitura de
 * arquivos fica em `scripts/check-traceability.ts`.
 */

export type TraceabilityReport = {
  /** Todos os IDs RN/RF definidos nos docs, na ordem em que aparecem. */
  defined: string[];
  total: number;
  covered: { id: string; files: string[] }[];
  uncovered: string[];
  /** IDs citados em testes que não existem nos docs (erro de digitação ou regra removida). */
  unknown: { id: string; files: string[] }[];
};

const DEFINITION = /^\s*(?:[-*]\s+)?\*\*((?:RN|RF)-[A-Z]+-\d+)\b/;
const ID_IN_TITLE = /\b(?:RN|RF)-[A-Z]+-\d+\b/g;
// it('..'), test('..'), describe('..') e variantes com .each([...])('..') / .skip(...). Só o
// primeiro argumento (o título) interessa; aceita aspas simples, duplas e template literal.
const TITLE_CALL =
  /\b(?:it|test|describe)(?:\.[A-Za-z]+)?(?:\((?:[^()]|\([^()]*\))*\))?\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;

const TEST_FILE = /\.(?:test|spec)\.ts$/;
const SKIPPED_DIRS = new Set(['node_modules', '.next', 'generated', 'fixtures']);
// Os testes desta ferramenta têm IDs reais como dado de exemplo; contá-los inflaria a cobertura.
const OWN_TEST_FILE = 'scripts/lib/traceability.test.ts';

const BOM = String.fromCharCode(0xfeff);

/** Remove o BOM (U+FEFF) do início de um texto, comum em arquivos salvos no Windows. */
export function stripBom(text: string): string {
  return text.startsWith(BOM) ? text.slice(1) : text;
}

/** Decide se um arquivo (caminho com `/`, relativo à raiz) entra na varredura de citações. */
export function isScannableTestFile(path: string): boolean {
  if (!TEST_FILE.test(path) || path === OWN_TEST_FILE) return false;
  return !path.split('/').some((part) => SKIPPED_DIRS.has(part));
}

/**
 * IDs DEFINIDOS num documento: linhas que começam com o ID em negrito
 * (`- **RN-DIN-01** ...` ou `**RF-AUT-01 — Login** ...`). Referências no meio do texto e
 * itens `(descontinuado)` não contam.
 */
export function extractDefinedIds(markdown: string): string[] {
  const ids = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    const id = DEFINITION.exec(line)?.[1];
    if (id && !line.includes('(descontinuado)')) ids.add(id);
  }
  return [...ids];
}

/** IDs RN/RF citados nos TÍTULOS de testes de um arquivo (comentários e corpo não contam). */
export function extractCitedIds(testSource: string): string[] {
  const ids = new Set<string>();
  for (const match of testSource.matchAll(TITLE_CALL)) {
    const title = match[2] ?? '';
    for (const id of title.match(ID_IN_TITLE) ?? []) ids.add(id);
  }
  return [...ids];
}

/** Cruza IDs definidos com IDs citados por arquivo de teste. */
export function computeTraceability(
  defined: string[],
  citations: Record<string, string[]>,
): TraceabilityReport {
  const definedSet = new Set(defined);
  const filesById = new Map<string, string[]>();

  for (const file of Object.keys(citations).sort()) {
    for (const id of citations[file] ?? []) {
      const files = filesById.get(id) ?? [];
      if (!files.includes(file)) files.push(file);
      filesById.set(id, files);
    }
  }

  const covered = defined
    .filter((id) => filesById.has(id))
    .map((id) => ({ id, files: filesById.get(id) ?? [] }));
  const uncovered = defined.filter((id) => !filesById.has(id));
  const unknown = [...filesById.entries()]
    .filter(([id]) => !definedSet.has(id))
    .map(([id, files]) => ({ id, files }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return { defined, total: defined.length, covered, uncovered, unknown };
}

const area = (id: string): string => id.split('-').slice(0, 2).join('-');

/** Texto legível do relatório (modo informativo: nunca falha o CI até o M7). */
export function formatReport(report: TraceabilityReport): string {
  const percent = report.total === 0 ? 0 : Math.round((report.covered.length / report.total) * 100);
  const coveredIds = new Set(report.covered.map((c) => c.id));

  const byArea = new Map<string, { covered: number; total: number; missing: string[] }>();
  for (const id of report.defined) {
    const entry = byArea.get(area(id)) ?? { covered: 0, total: 0, missing: [] };
    entry.total += 1;
    if (coveredIds.has(id)) entry.covered += 1;
    else entry.missing.push(id);
    byArea.set(area(id), entry);
  }

  const lines = [
    'Rastreabilidade RN/RF (modo informativo: não falha o CI)',
    `Cobertos: ${report.covered.length} de ${report.total} (${percent}%)`,
    '',
    'Por área:',
    ...[...byArea].map(([name, e]) => `  ${name}: ${e.covered}/${e.total}`),
  ];

  if (report.uncovered.length > 0) {
    lines.push('', `Sem teste (${report.uncovered.length}):`);
    for (const [name, e] of byArea) {
      if (e.missing.length > 0) lines.push(`  ${name}: ${e.missing.join(', ')}`);
    }
  }

  if (report.unknown.length > 0) {
    lines.push('', 'Aviso: IDs citados em testes que não existem nos docs:');
    for (const u of report.unknown) lines.push(`  ${u.id} (${u.files.join(', ')})`);
  }

  return lines.join('\n');
}
