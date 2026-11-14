import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  computeTraceability,
  extractCitedIds,
  extractDefinedIds,
  formatReport,
  isScannableTestFile,
  stripBom,
} from './lib/traceability';

// Modo informativo (M0): imprime o relatório e sai com 0. A partir do M7 passa a falhar o
// CI para as regras do escopo concluído (docs/07 §7), o que exigirá um modo estrito aqui.

const ROOT = process.cwd();
const DOCS = ['docs/01-regras-de-negocio.md', 'docs/02-requisitos-funcionais.md'];
const TEST_ROOTS = ['src', 'tests', 'scripts'];

const toPosix = (path: string): string => path.split(sep).join('/');

function listTestFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = toPosix(relative(ROOT, join(entry.parentPath, entry.name)));
    if (isScannableTestFile(path)) files.push(path);
  }
  return files;
}

const readText = (path: string): string => stripBom(readFileSync(join(ROOT, path), 'utf8'));

function main(): void {
  const defined = [...new Set(DOCS.flatMap((doc) => extractDefinedIds(readText(doc))))];

  const citations: Record<string, string[]> = {};
  for (const file of TEST_ROOTS.flatMap(listTestFiles)) {
    const ids = extractCitedIds(readText(file));
    if (ids.length > 0) citations[file] = ids;
  }

  console.log(formatReport(computeTraceability(defined, citations)));
}

main();
