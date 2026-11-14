import { describe, expect, it } from 'vitest';
import {
  computeTraceability,
  extractCitedIds,
  extractDefinedIds,
  formatReport,
} from './traceability';

describe('extractDefinedIds', () => {
  it('[RNF-MAN-05] extrai regras no formato de lista do doc 01 (- **RN-XXX-NN** ...)', () => {
    const doc = [
      '## Dinheiro',
      '',
      '- **RN-DIN-01** `[Decisão]` Todo valor é inteiro.',
      '- **RN-DIN-02** `[Decisão]` Desconto half-up.',
    ].join('\n');

    expect(extractDefinedIds(doc)).toEqual(['RN-DIN-01', 'RN-DIN-02']);
  });

  it('[RNF-MAN-05] extrai requisitos no formato do doc 02 (**RF-XXX-NN — Título**), sem pegar as RN citadas na linha', () => {
    const doc = '**RF-AUT-01 — Login** `[M]` · RN-ACE-01, RN-ACE-05\n**RF-AUT-02 — Logout** `[M]`';

    expect(extractDefinedIds(doc)).toEqual(['RF-AUT-01', 'RF-AUT-02']);
  });

  it('[RNF-MAN-05] ignora referências no meio do texto e atalhos como RN-CAT-01/02', () => {
    const doc = [
      '- **RN-VEN-08** Cada item guarda snapshot (RN-DIN-05).',
      'Texto solto que cita RN-DIN-03 e RN-CAT-01/02/03.',
    ].join('\n');

    expect(extractDefinedIds(doc)).toEqual(['RN-VEN-08']);
  });

  it('[RNF-MAN-05] ignora requisitos não funcionais (RNF), que não entram na regra de rastreio', () => {
    expect(extractDefinedIds('- **RNF-DES-01** Busca em 300 ms.')).toEqual([]);
  });

  it('[RNF-MAN-05] itens marcados como (descontinuado) não são exigidos', () => {
    const doc = '- **RN-OLD-01** (descontinuado) Regra antiga.\n- **RN-NEW-01** Regra viva.';

    expect(extractDefinedIds(doc)).toEqual(['RN-NEW-01']);
  });

  it('[RNF-MAN-05] aceita CRLF e não repete IDs', () => {
    const doc = '- **RN-DIN-01** a\r\n- **RN-DIN-01** repetido\r\n- **RN-DIN-02** b\r\n';

    expect(extractDefinedIds(doc)).toEqual(['RN-DIN-01', 'RN-DIN-02']);
  });
});

describe('extractCitedIds', () => {
  it('[RNF-MAN-05] lê o ID do título de it/test/describe', () => {
    const source = [
      "describe('[RN-DIN-01] dinheiro', () => {",
      "  it('[RN-DIN-02] half-up', () => {});",
      "  test('[RF-CAT-01] cadastra', () => {});",
      '});',
    ].join('\n');

    expect(extractCitedIds(source).sort()).toEqual(['RF-CAT-01', 'RN-DIN-01', 'RN-DIN-02']);
  });

  it('[RNF-MAN-05] aceita vários IDs no mesmo título', () => {
    const source = [
      "it('[RN-DIN-01][RF-CAT-01] a', () => {});",
      "it('[RN-DIN-02, RN-DIN-03] b', () => {});",
    ].join('\n');

    expect(extractCitedIds(source).sort()).toEqual([
      'RF-CAT-01',
      'RN-DIN-01',
      'RN-DIN-02',
      'RN-DIN-03',
    ]);
  });

  it('[RNF-MAN-05] lê o título de it.each(...)(...) e de template literal', () => {
    const source = [
      "it.each([1, 2, 3])('[RN-DIN-04] caso %i', () => {});",
      'it(`[RN-DIN-05] com template`, () => {});',
    ].join('\n');

    expect(extractCitedIds(source).sort()).toEqual(['RN-DIN-04', 'RN-DIN-05']);
  });

  it('[RNF-MAN-05] só vale ID no título: comentários, corpo e strings soltas não contam', () => {
    const source = [
      '// RN-DIN-01 cobre isto',
      "const regra = 'RN-DIN-02';",
      "it('sem id no título', () => { expect(regra).toBe('RN-DIN-03'); });",
    ].join('\n');

    expect(extractCitedIds(source)).toEqual([]);
  });

  it('[RNF-MAN-05] ignora tags que não são RN/RF (RNF, ADR, OQ, seções)', () => {
    const source = "it('[RNF-SEG-06][ADR-012][OQ-14][07 §4] algo', () => {});";

    expect(extractCitedIds(source)).toEqual([]);
  });
});

describe('computeTraceability', () => {
  const defined = ['RN-DIN-01', 'RN-DIN-02', 'RN-CAT-01', 'RF-CAT-01'];

  it('[RNF-MAN-05] separa cobertos, sem teste e IDs citados que não existem nos docs', () => {
    const report = computeTraceability(defined, {
      'src/a.test.ts': ['RN-DIN-01', 'RN-DIN-02'],
      'src/b.test.ts': ['RN-DIN-01', 'RN-XXX-99'],
    });

    expect(report.total).toBe(4);
    expect(report.covered.map((c) => c.id)).toEqual(['RN-DIN-01', 'RN-DIN-02']);
    expect(report.uncovered).toEqual(['RN-CAT-01', 'RF-CAT-01']);
    expect(report.unknown).toEqual([{ id: 'RN-XXX-99', files: ['src/b.test.ts'] }]);
  });

  it('[RNF-MAN-05] lista os arquivos que cobrem cada ID', () => {
    const report = computeTraceability(defined, {
      'src/a.test.ts': ['RN-DIN-01'],
      'src/b.test.ts': ['RN-DIN-01'],
    });

    expect(report.covered).toEqual([{ id: 'RN-DIN-01', files: ['src/a.test.ts', 'src/b.test.ts'] }]);
  });

  it('[RNF-MAN-05] sem nenhum teste, tudo fica descoberto', () => {
    const report = computeTraceability(defined, {});

    expect(report.covered).toEqual([]);
    expect(report.uncovered).toEqual(defined);
  });
});

describe('formatReport', () => {
  const report = computeTraceability(['RN-DIN-01', 'RN-DIN-02', 'RN-CAT-01', 'RF-CAT-01'], {
    'src/a.test.ts': ['RN-DIN-01', 'RN-DIN-02', 'RN-XXX-99'],
  });
  const text = formatReport(report);

  it('[RNF-MAN-05] mostra o total coberto e o modo informativo', () => {
    expect(text).toContain('Cobertos: 2 de 4');
    expect(text).toContain('informativo');
  });

  it('[RNF-MAN-05] resume por área (prefixo do ID)', () => {
    expect(text).toContain('RN-DIN: 2/2');
    expect(text).toContain('RN-CAT: 0/1');
    expect(text).toContain('RF-CAT: 0/1');
  });

  it('[RNF-MAN-05] lista os IDs sem teste e avisa dos IDs desconhecidos', () => {
    expect(text).toContain('RN-CAT-01');
    expect(text).toContain('RF-CAT-01');
    expect(text).toContain('RN-XXX-99');
  });
});
