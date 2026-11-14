import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts']),
  {
    rules: {
      // Sem supressões silenciosas (CLAUDE.md): `any` explícito é erro.
      '@typescript-eslint/no-explicit-any': 'error',
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
