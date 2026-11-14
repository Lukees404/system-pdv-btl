import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'tests/fixtures/**', // código de mentira que viola as fronteiras de propósito
  ]),
  {
    rules: {
      // Sem supressões silenciosas (CLAUDE.md): `any` explícito é erro.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Regra de negócio não lê o relógio do sistema: recebe um `Clock` (ADR-015).
    // `new Date(valor)` (converter uma data recebida) continua permitido.
    files: ['src/modules/**/{domain,application}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Use o Clock injetado em vez de new Date() (ADR-015).',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Use o Clock injetado em vez de Date.now() (ADR-015).',
        },
      ],
    },
  },
  {
    // Configuração só entra por `lib/env.ts`, validada (RNF-OPS-03).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/env.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Use getEnv() de "@/lib/env"; só src/lib/env.ts lê process.env.',
        },
      ],
    },
  },
]);

export default eslintConfig;
