import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCatalogTestKit, type CatalogTestKit } from '../test-support';
import { searchProducts } from './search-products';

const TOTAL = 5000;
const SAMPLES = 50;
/** RNF-DES-01: busca p95 ≤ 300 ms com 5.000 itens. */
const P95_LIMIT_MS = 300;

/** Mesmos termos que o dono digitaria: parcial, com acento e caixa trocados, código de barras. */
const TERMS = [
  'coleira',
  'RAÇÃO',
  'racao',
  'brinq',
  'antipulgas',
  'shampoo',
  'cama',
  'gato',
  'cão',
  'petisco',
];

function p95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1]!;
}

describe('busca de produtos com 5.000 itens (banco real)', () => {
  let kit: CatalogTestKit;

  beforeAll(async () => {
    kit = await createCatalogTestKit();
    // Insere direto como dono: 5.000 chamadas ao caso de uso seriam lentas e não são o que se mede.
    await kit.owner(
      `INSERT INTO products (id, name, name_normalized, barcode, price_cents, updated_at)
       SELECT gen_random_uuid(),
              'Produto ' || n || ' ' || w,
              lower('produto ' || n || ' ' || w),
              CASE WHEN n % 2 = 0 THEN lpad(n::text, 13, '0') END,
              1000 + n,
              now()
         FROM (SELECT n, (ARRAY['coleira antipulgas','racao premium','brinquedo mordedor',
                                'shampoo neutro','cama gato','petisco caes'])[1 + n % 6] AS w
                 FROM generate_series(1, $1::int) AS n) AS t`,
      [TOTAL],
    );
    await kit.owner('ANALYZE products');
  }, 120_000);

  afterAll(async () => {
    await kit?.close();
  });

  it('[RNF-DES-01] p95 das buscas por nome parcial, com acento e por código fica ≤ 300 ms', async () => {
    const barcode = '0'.repeat(11) + '42'; // produto nº 42 (par, então tem código)
    const queries = [...TERMS, barcode];
    // aquece o pool e o plano antes de medir
    await searchProducts(kit.deps, { query: 'coleira' });

    const times: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const query = queries[i % queries.length];
      const start = performance.now();
      const rows = await searchProducts(kit.deps, { query });
      times.push(performance.now() - start);
      expect(rows.length).toBeGreaterThan(0);
    }

    expect(p95(times)).toBeLessThanOrEqual(P95_LIMIT_MS);
  }, 120_000);

  it('[RNF-DES-01] a listagem sem termo (primeira página) também fica ≤ 300 ms', async () => {
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      const rows = await searchProducts(kit.deps, { limit: 50, offset: i * 50 });
      times.push(performance.now() - start);
      expect(rows).toHaveLength(50);
    }
    expect(p95(times)).toBeLessThanOrEqual(P95_LIMIT_MS);
  }, 120_000);
});
