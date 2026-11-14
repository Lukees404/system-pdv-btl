import { createRequire } from 'node:module';
import { cruise, type ICruiseOptions, type IReporterOutput } from 'dependency-cruiser';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const FIXTURES = 'tests/fixtures/boundaries/src';
const require = createRequire(import.meta.url);
const config = require('../../.dependency-cruiser.cjs') as {
  forbidden: unknown[];
  options: ICruiseOptions;
};

type Violation = { rule: string; from: string; to: string };

async function cruiseFixtures(): Promise<Violation[]> {
  const result: IReporterOutput = await cruise([FIXTURES], {
    ...config.options,
    validate: true,
    ruleSet: { forbidden: config.forbidden },
  } as ICruiseOptions);

  const summary = (typeof result.output === 'object' ? result.output : undefined)?.summary;
  const strip = (path: string) => path.replace(`${FIXTURES}/`, '');
  return (summary?.violations ?? [])
    .map((v) => ({ rule: v.rule.name, from: strip(v.from), to: strip(v.to) }))
    .sort((a, b) => `${a.rule}|${a.from}`.localeCompare(`${b.rule}|${b.from}`));
}

describe('fronteiras de módulos (dependency-cruiser sobre fixtures)', () => {
  it('[RNF-MAN-02][RNF-MAN-03] detecta exatamente as violações esperadas, sem falso positivo', async () => {
    const violations = await cruiseFixtures();
    const withoutCycles = violations.filter((v) => v.rule !== 'no-circular');

    expect(withoutCycles).toEqual(
      [
        // Um módulo só entra em outro pelo index.ts (04, regra 1).
        {
          rule: 'only-public-api-between-modules',
          from: 'modules/sales/application/bad-imports-internals.ts',
          to: 'modules/inventory/infrastructure/repo.ts',
        },
        // Matriz de dependências permitidas (04): catalog, cash-register e reports não dependem de sales/catalog.
        {
          rule: 'module-catalog-allowed-dependencies',
          from: 'modules/catalog/application/bad-imports-sales.ts',
          to: 'modules/sales/index.ts',
        },
        {
          rule: 'module-cash-register-allowed-dependencies',
          from: 'modules/cash-register/application/bad-imports-sales.ts',
          to: 'modules/sales/index.ts',
        },
        {
          rule: 'module-reports-allowed-dependencies',
          from: 'modules/reports/application/bad-imports-catalog.ts',
          to: 'modules/catalog/index.ts',
        },
        // domain/ é puro (04, regra 2).
        {
          rule: 'domain-has-no-framework',
          from: 'modules/sales/domain/bad-imports-next.ts',
          to: expect.stringContaining('node_modules/next/'),
        },
        {
          rule: 'domain-has-no-framework',
          from: 'modules/sales/domain/bad-imports-react.ts',
          to: expect.stringContaining('node_modules/react/'),
        },
        {
          rule: 'domain-has-no-framework',
          from: 'modules/sales/domain/bad-imports-zod.ts',
          to: expect.stringContaining('node_modules/zod/'),
        },
        {
          rule: 'domain-has-no-lib',
          from: 'modules/sales/domain/bad-imports-lib.ts',
          to: 'lib/env.ts',
        },
        {
          rule: 'domain-has-no-node-core',
          from: 'modules/sales/domain/bad-imports-node-core.ts',
          to: 'node:fs',
        },
        {
          rule: 'domain-does-not-depend-on-outer-layers',
          from: 'modules/sales/domain/bad-imports-outer-layer.ts',
          to: 'modules/sales/application/ok-uses-public-apis.ts',
        },
        // shared/ não importa módulos (04, regra 3).
        {
          rule: 'shared-does-not-import-modules',
          from: 'shared/bad-imports-module.ts',
          to: 'modules/sales/index.ts',
        },
      ].sort((a, b) => `${a.rule}|${a.from}`.localeCompare(`${b.rule}|${b.from}`)),
    );
  });

  it('[RNF-MAN-02] detecta dependência circular (04, regra 4)', async () => {
    const cycles = (await cruiseFixtures()).filter((v) => v.rule === 'no-circular');

    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles.every((v) => v.from.includes('cycle-') && v.to.includes('cycle-'))).toBe(true);
  });
});

describe('relógio fora do domínio (ESLint)', () => {
  const eslint = new ESLint({ cwd: process.cwd() });

  async function ruleIds(filePath: string, code: string): Promise<string[]> {
    const [result] = await eslint.lintText(code, { filePath });
    return (result?.messages ?? []).map((m) => m.ruleId ?? 'parse-error');
  }

  it('[ADR-015] new Date() sem argumento é proibido em domain/ e application/', async () => {
    expect(await ruleIds('src/modules/sales/domain/x.ts', 'export const now = new Date();\n')).toEqual([
      'no-restricted-syntax',
    ]);
    expect(
      await ruleIds('src/modules/sales/application/x.ts', 'export const now = new Date();\n'),
    ).toEqual(['no-restricted-syntax']);
  });

  it('[ADR-015] Date.now() é proibido em domain/ e application/', async () => {
    expect(await ruleIds('src/modules/sales/domain/x.ts', 'export const now = Date.now();\n')).toEqual([
      'no-restricted-syntax',
    ]);
  });

  it('[ADR-015] converter uma data recebida (new Date(valor)) é permitido', async () => {
    expect(
      await ruleIds('src/modules/sales/domain/x.ts', 'export const d = (v: string) => new Date(v);\n'),
    ).toEqual([]);
  });

  it('[ADR-015] o relógio de verdade pode usar new Date() em shared/clock', async () => {
    expect(await ruleIds('src/shared/clock/clock.ts', 'export const now = new Date();\n')).toEqual([]);
  });
}, 60_000);
