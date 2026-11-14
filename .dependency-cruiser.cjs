/**
 * Fronteiras de módulos (docs/04 — "Fronteiras de módulos", ADR-001, RNF-MAN-02/03).
 * Os caminhos usam `(^|/)modules/...` para valer tanto para `src/` quanto para as
 * fixtures de teste (tests/boundaries). `$2` nas regras é o nome do módulo de origem.
 */

// Matriz de dependências permitidas entre módulos (docs/04). `shared` e `config`
// não ficam aqui: qualquer um pode usá-los. `reports` lê SQL direto, não importa módulos.
const ALLOWED = {
  audit: [],
  auth: ['audit'],
  catalog: ['audit'],
  customers: ['audit'],
  inventory: ['audit', 'catalog'],
  'cash-register': ['audit'],
  sales: ['audit', 'catalog', 'customers', 'inventory', 'cash-register'],
  import: ['audit', 'catalog', 'inventory'],
  reports: [],
  fiscal: ['audit', 'sales'],
};
const MODULES = Object.keys(ALLOWED);

const matrixRules = MODULES.map((name) => {
  const forbiddenTargets = MODULES.filter(
    (other) => other !== name && !ALLOWED[name].includes(other),
  );
  return {
    name: `module-${name}-allowed-dependencies`,
    comment: `docs/04: "${name}" só pode depender de: ${ALLOWED[name].join(', ') || '(nenhum módulo)'}.`,
    severity: 'error',
    from: { path: `(^|/)modules/${name}/` },
    to: { path: `(^|/)modules/(${forbiddenTargets.join('|')})/` },
  };
});

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'docs/04, regra 4: sem dependências circulares.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'only-public-api-between-modules',
      comment: 'docs/04, regra 1: um módulo só importa outro módulo pelo index.ts.',
      severity: 'error',
      from: { path: '(^|/)modules/([^/]+)/' },
      to: {
        path: '(^|/)modules/[^/]+/',
        pathNot: ['(^|/)modules/$2/', '(^|/)modules/[^/]+/index\\.ts$'],
      },
    },
    ...matrixRules,
    {
      name: 'domain-has-no-framework',
      comment: 'docs/04, regra 2: domain/ é puro (sem Next, React, Prisma, zod, rede).',
      severity: 'error',
      from: { path: '(^|/)modules/[^/]+/domain/' },
      to: { path: 'node_modules/(next|react|react-dom|zod|@prisma/[^/]+|prisma|pg)/' },
    },
    {
      name: 'domain-has-no-node-core',
      comment: 'docs/04, regra 2: domain/ não usa módulos do Node (fs, http, crypto...).',
      severity: 'error',
      from: { path: '(^|/)modules/[^/]+/domain/' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'domain-has-no-lib',
      comment: 'domain/ não usa lib/ (banco, env, logger).',
      severity: 'error',
      from: { path: '(^|/)modules/[^/]+/domain/' },
      to: { path: '(^|/)src/lib/|(^|/)lib/' },
    },
    {
      name: 'domain-does-not-depend-on-outer-layers',
      comment: 'domain/ não depende de application/, infrastructure/ nem ui/.',
      severity: 'error',
      from: { path: '(^|/)modules/[^/]+/domain/' },
      to: { path: '(^|/)modules/[^/]+/(application|infrastructure|ui)/' },
    },
    {
      name: 'shared-does-not-import-modules',
      comment: 'docs/04, regra 3: shared/ não importa módulos.',
      severity: 'error',
      from: { path: '(^|/)src/shared/' },
      to: { path: '(^|/)modules/' },
    },
  ],
  options: {
    // Conta também `import type`: a fronteira vale para tipos.
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
