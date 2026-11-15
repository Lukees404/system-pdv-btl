import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { normalizeText } from '@/shared/text';
import { createIsolatedDatabase, query, type IsolatedDatabase } from '../helpers/db';

// Invariantes do catálogo garantidas NO BANCO (RNF-INT-02), não só no código.
describe('esquema do catálogo', () => {
  let db: IsolatedDatabase;
  let counter = 0;

  beforeAll(async () => {
    db = await createIsolatedDatabase({ migrate: true });
  }, 90_000);
  afterAll(async () => {
    await db.drop();
  });

  type ProductOverrides = {
    name?: string;
    normalized?: string;
    barcode?: string | null;
    categoryId?: string | null;
    price?: number;
    cost?: number | null;
    stock?: number;
    minStock?: number;
    ncm?: string | null;
    cest?: string | null;
    cfop?: string | null;
    csosn?: string | null;
    origin?: number | null;
    unit?: string;
    archived?: boolean;
  };

  const insertProduct = (o: ProductOverrides = {}) => {
    counter += 1;
    const name = o.name ?? `Produto ${counter}`;
    return query<{ id: string }>(
      db.ownerUrl,
      `INSERT INTO products (id, name, name_normalized, barcode, category_id, price_cents, cost_cents,
         stock_qty, min_stock, ncm, cest, cfop, csosn, origin, unit, archived_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
         CASE WHEN $15::boolean THEN now() END, now(), now()) RETURNING id`,
      [
        name,
        o.normalized ?? normalizeText(name),
        o.barcode ?? null,
        o.categoryId ?? null,
        o.price ?? 1000,
        o.cost ?? null,
        o.stock ?? 0,
        o.minStock ?? 0,
        o.ncm ?? null,
        o.cest ?? null,
        o.cfop ?? null,
        o.csosn ?? null,
        o.origin ?? null,
        o.unit ?? 'UN',
        o.archived ?? false,
      ],
    );
  };

  const insertCategory = (name: string) =>
    query<{ id: string }>(
      db.ownerUrl,
      `INSERT INTO categories (id, name, name_normalized, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, now(), now()) RETURNING id`,
      [name, normalizeText(name)],
    );

  const insertService = (
    name: string,
    o: { fee?: boolean; price?: number; archived?: boolean } = {},
  ) =>
    query<{ id: string }>(
      db.ownerUrl,
      `INSERT INTO services (id, name, name_normalized, price_cents, is_displacement_fee, archived_at,
         created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, CASE WHEN $5::boolean THEN now() END, now(), now())
       RETURNING id`,
      [name, normalizeText(name), o.price ?? 0, o.fee ?? false, o.archived ?? false],
    );

  const idOf = async (rows: Promise<{ id: string }[]>) => (await rows)[0]!.id;

  const CHECK = { code: '23514' };
  const UNIQUE = { code: '23505' };

  describe('extensões (ADR-020)', () => {
    it('[ADR-020] pg_trgm fica no schema ext e o unaccent não existe mais', async () => {
      const rows = await query<{ extname: string; schema: string }>(
        db.ownerUrl,
        `SELECT e.extname, n.nspname AS schema FROM pg_extension e
         JOIN pg_namespace n ON n.oid = e.extnamespace
         WHERE e.extname IN ('unaccent', 'pg_trgm') ORDER BY e.extname`,
      );

      expect(rows).toEqual([{ extname: 'pg_trgm', schema: 'ext' }]);
    });
  });

  describe('products', () => {
    it('[RN-CAT-01] cria produto ativo com estoque 0, unidade UN e sem custo por padrão', async () => {
      const id = await idOf(insertProduct({ name: 'Coleira' }));

      const [row] = await query<Record<string, unknown>>(
        db.ownerUrl,
        'SELECT stock_qty, min_stock, unit, cost_cents, archived_at, barcode FROM products WHERE id = $1',
        [id],
      );
      expect(row).toMatchObject({
        stock_qty: 0,
        min_stock: 0,
        unit: 'UN',
        cost_cents: null,
        archived_at: null,
        barcode: null,
      });
    });

    it('[RN-CAT-01] preço, custo, estoque e estoque mínimo não podem ser negativos', async () => {
      await expect(insertProduct({ price: -1 })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ cost: -1 })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ stock: -1 })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ minStock: -1 })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ price: 0, cost: 0 })).resolves.toHaveLength(1);
    });

    it('[RN-CAT-01] nome de 1 a 120 caracteres e nome normalizado não vazio', async () => {
      await expect(insertProduct({ name: '', normalized: 'x' })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ name: 'x'.repeat(121) })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ name: 'x'.repeat(120) })).resolves.toHaveLength(1);
      await expect(insertProduct({ name: 'Algo', normalized: '' })).rejects.toMatchObject(CHECK);
    });

    it('[RN-CAT-02] nome único entre ativos (sem acento e caixa); arquivado libera o nome', async () => {
      const id = await idOf(insertProduct({ name: 'Ração Premium' }));

      await expect(insertProduct({ name: 'RACAO premium' })).rejects.toMatchObject(UNIQUE);

      await query(db.ownerUrl, 'UPDATE products SET archived_at = now() WHERE id = $1', [id]);
      await expect(insertProduct({ name: 'RACAO premium' })).resolves.toHaveLength(1);
    });

    it('[RN-CAT-02][RN-CAT-04] reativar um produto cujo nome foi tomado por outro ativo conflita', async () => {
      const id = await idOf(insertProduct({ name: 'Shampoo Neutro', archived: true }));
      await insertProduct({ name: 'shampoo neutro' });

      await expect(
        query(db.ownerUrl, 'UPDATE products SET archived_at = NULL WHERE id = $1', [id]),
      ).rejects.toMatchObject(UNIQUE);
    });

    it('[RN-CAT-03] código de barras é opcional, repetível quando nulo e único entre TODOS (inclusive arquivados)', async () => {
      await insertProduct({ barcode: null });
      await insertProduct({ barcode: null });

      await insertProduct({ barcode: '7891000100103', archived: true });
      await expect(insertProduct({ barcode: '7891000100103' })).rejects.toMatchObject(UNIQUE);
    });

    it('[RN-CAT-03] código de barras informado não pode ser vazio nem ter espaços nas pontas', async () => {
      await expect(insertProduct({ barcode: '' })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ barcode: ' 123 ' })).rejects.toMatchObject(CHECK);
    });

    it('[RN-FIS-02] campos fiscais: NCM 8, CEST 7, CFOP 4 e CSOSN 3 dígitos, origem 0–8, unidade 2 letras', async () => {
      await expect(
        insertProduct({ ncm: '23091000', cest: '1234567', cfop: '5102', csosn: '102', origin: 0 }),
      ).resolves.toHaveLength(1);

      await expect(insertProduct({ ncm: '1234567' })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ ncm: '1234567a' })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ cest: '123456' })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ cfop: '510' })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ csosn: '10' })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ origin: 9 })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ origin: -1 })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ unit: 'U' })).rejects.toMatchObject(CHECK);
      await expect(insertProduct({ unit: 'un' })).rejects.toMatchObject(CHECK);
    });

    it('[RN-CAT-04] a aplicação (pdv_app) lê e grava produtos, mas NÃO consegue excluir (só arquivar)', async () => {
      const id = await idOf(insertProduct({ name: 'Brinquedo' }));

      await query(db.appUrl, 'UPDATE products SET price_cents = 1500 WHERE id = $1', [id]);
      await expect(
        query(db.appUrl, 'DELETE FROM products WHERE id = $1', [id]),
      ).rejects.toMatchObject({
        code: '42501', // insufficient_privilege
      });
    });
  });

  describe('categories', () => {
    it('[RN-CAT-07] nome normalizado é único (sem acento e caixa)', async () => {
      await insertCategory('Acessórios');

      await expect(insertCategory('ACESSORIOS')).rejects.toMatchObject(UNIQUE);
    });

    it('[RF-CAT-06] só se exclui categoria vazia: com produto, o banco recusa (RESTRICT)', async () => {
      const categoryId = await idOf(insertCategory('Higiene'));
      await insertProduct({ name: 'Sabonete Pet', categoryId });

      await expect(
        query(db.appUrl, 'DELETE FROM categories WHERE id = $1', [categoryId]),
      ).rejects.toMatchObject({ code: '23503' }); // foreign_key_violation

      const emptyId = await idOf(insertCategory('Vazia'));
      await expect(
        query(db.appUrl, 'DELETE FROM categories WHERE id = $1 RETURNING id', [emptyId]),
      ).resolves.toHaveLength(1);
    });
  });

  describe('services', () => {
    it('[RN-SER-01] preço padrão não pode ser negativo; nome único entre ativos', async () => {
      await expect(insertService('Consulta', { price: -1 })).rejects.toMatchObject(CHECK);
      await insertService('Vacinação');

      await expect(insertService('VACINACAO')).rejects.toMatchObject(UNIQUE);
    });

    it('[RN-SER-03] no máximo UMA taxa de deslocamento no sistema', async () => {
      await insertService('Taxa de deslocamento', { fee: true });

      await expect(insertService('Outra taxa', { fee: true })).rejects.toMatchObject(UNIQUE);
      await expect(insertService('Raspado', { fee: false })).resolves.toHaveLength(1);
    });

    it('[RN-SER-05][RN-SER-07] serviço não tem estoque nem custo (nenhuma coluna para isso)', async () => {
      const columns = await query<{ column_name: string }>(
        db.ownerUrl,
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'services'`,
      );
      const names = columns.map((c) => c.column_name);

      expect(names).toContain('price_cents'); // a tabela existe (não passa no vazio)
      expect(names).not.toContain('stock_qty');
      expect(names).not.toContain('cost_cents');
    });

    it('[RN-CAT-04] a aplicação (pdv_app) não consegue excluir serviços (só arquivar)', async () => {
      const id = await idOf(insertService('Atestado de viagem'));

      await expect(
        query(db.appUrl, 'DELETE FROM services WHERE id = $1', [id]),
      ).rejects.toMatchObject({
        code: '42501',
      });
    });
  });

  describe('busca (ADR-020, RNF-DES-01)', () => {
    it('[ADR-020] o índice trigram é utilizável pela busca parcial ILIKE (com a varredura desligada o planejador o escolhe)', async () => {
      await query(
        db.ownerUrl,
        `INSERT INTO products (id, name, name_normalized, price_cents, created_at, updated_at)
         SELECT gen_random_uuid(), 'Item ' || n || ' ' || w, 'item ' || n || ' ' || w, 1000, now(), now()
         FROM generate_series(1, 5000) AS n,
              LATERAL (SELECT CASE WHEN n % 500 = 0 THEN 'coleira' ELSE (ARRAY['racao','brinquedo','shampoo','petisco','areia'])[1 + n % 5] END AS w) AS words`,
      );

      // Com 5.000 linhas o planejador prefere varrer a tabela (é mais barato e rápido); o que
      // este teste prova é que o índice e o operador ILIKE combinam. O limite de tempo da busca
      // (RNF-DES-01) é medido no teste de desempenho.
      const client = new Client({ connectionString: db.ownerUrl });
      await client.connect();
      try {
        await client.query('ANALYZE products');
        await client.query('SET enable_seqscan = off');
        const plan = await client.query(
          `EXPLAIN (FORMAT JSON) SELECT id FROM products WHERE name_normalized ILIKE '%olei%'`,
        );

        const text = JSON.stringify(plan.rows[0]['QUERY PLAN']);
        expect(text).toContain('Bitmap Index Scan');
        expect(text).toContain('products_name_trgm_idx');
      } finally {
        await client.end();
      }
    });
  });
});
