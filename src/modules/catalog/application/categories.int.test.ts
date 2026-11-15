import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCatalogTestKit, type CatalogTestKit } from '../test-support';
import { createCategory } from './create-category';
import { deleteCategory } from './delete-category';
import { listCategories } from './list-categories';
import { renameCategory } from './rename-category';

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : (result.error?.code ?? null);

describe('categorias (banco real)', () => {
  let kit: CatalogTestKit;

  beforeAll(async () => {
    kit = await createCatalogTestKit();
  }, 90_000);
  afterAll(async () => {
    await kit.close();
  });

  const create = (name: string) => createCategory(kit.deps, { name });

  const insertProduct = (categoryId: string, name: string) =>
    kit.owner(
      `INSERT INTO products (id, name, name_normalized, category_id, price_cents, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, lower($1), $2, 1000, now(), now())`,
      [name, categoryId],
    );

  describe('createCategory', () => {
    it('[RF-CAT-06][RN-CAT-07] cria a categoria com o nome aparado e o nome normalizado', async () => {
      const result = await create('  Acessórios ');

      expect(result.ok).toBe(true);
      const [row] = await kit.owner<{ name: string; name_normalized: string }>(
        'SELECT name, name_normalized FROM categories WHERE id = $1',
        [result.ok ? result.value.id : ''],
      );
      expect(row).toEqual({ name: 'Acessórios', name_normalized: 'acessorios' });
    });

    it('[RN-CAT-07] nome repetido (sem acento e caixa) → CATEGORY_NAME_TAKEN', async () => {
      await create('Higiene');

      expect(codeOf(await create('HIGIENE'))).toBe('CATEGORY_NAME_TAKEN');
      expect(codeOf(await create('  higiene  '))).toBe('CATEGORY_NAME_TAKEN');
    });

    it('[RN-CAT-07] nome inválido é recusado pelo domínio (INVALID_NAME), sem tocar no banco', async () => {
      expect(codeOf(await create('   '))).toBe('INVALID_NAME');
      expect(codeOf(await create('a'.repeat(101)))).toBe('INVALID_NAME');
    });

    it('[RN-CAT-07] dois cadastros simultâneos do mesmo nome: um vence e o outro recebe CATEGORY_NAME_TAKEN', async () => {
      const results = await Promise.all([create('Corrida'), create('corrida')]);

      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.map(codeOf).filter(Boolean)).toEqual(['CATEGORY_NAME_TAKEN']);
    });
  });

  describe('renameCategory', () => {
    it('[RF-CAT-06] renomeia; o id e os produtos ligados continuam os mesmos', async () => {
      const created = await create('Brinquedos Velhos');
      const id = created.ok ? created.value.id : '';
      await insertProduct(id, 'Bola');

      const result = await renameCategory(kit.deps, { id, name: 'Brinquedos' });

      expect(result.ok).toBe(true);
      const [row] = await kit.owner<{ name: string; n: string }>(
        `SELECT c.name, (SELECT count(*) FROM products p WHERE p.category_id = c.id)::text AS n
           FROM categories c WHERE c.id = $1`,
        [id],
      );
      expect(row).toEqual({ name: 'Brinquedos', n: '1' });
    });

    it('[RN-CAT-07] pode mudar só a caixa/acento do próprio nome, mas não tomar o de outra categoria', async () => {
      const a = await create('Petiscos');
      await create('Areia');
      const id = a.ok ? a.value.id : '';

      expect((await renameCategory(kit.deps, { id, name: 'PETISCOS' })).ok).toBe(true);
      expect(codeOf(await renameCategory(kit.deps, { id, name: 'areia' }))).toBe(
        'CATEGORY_NAME_TAKEN',
      );
    });

    it('[RF-CAT-06] categoria inexistente → NOT_FOUND; nome inválido → INVALID_NAME', async () => {
      const created = await create('Para Renomear');
      const id = created.ok ? created.value.id : '';

      expect(
        codeOf(
          await renameCategory(kit.deps, {
            id: '00000000-0000-4000-8000-0000000fffff',
            name: 'Qualquer',
          }),
        ),
      ).toBe('NOT_FOUND');
      expect(codeOf(await renameCategory(kit.deps, { id, name: ' ' }))).toBe('INVALID_NAME');
    });
  });

  describe('deleteCategory', () => {
    it('[RF-CAT-06] exclui categoria vazia', async () => {
      const created = await create('Vazia');
      const id = created.ok ? created.value.id : '';

      expect((await deleteCategory(kit.deps, { id })).ok).toBe(true);
      expect(await kit.owner('SELECT 1 FROM categories WHERE id = $1', [id])).toHaveLength(0);
    });

    it('[RF-CAT-06] categoria com produto NÃO é excluída: CATEGORY_NOT_EMPTY e nada muda', async () => {
      const created = await create('Com Produto');
      const id = created.ok ? created.value.id : '';
      await insertProduct(id, 'Produto Preso');

      expect(codeOf(await deleteCategory(kit.deps, { id }))).toBe('CATEGORY_NOT_EMPTY');
      expect(await kit.owner('SELECT 1 FROM categories WHERE id = $1', [id])).toHaveLength(1);
    });

    it('[RF-CAT-06] categoria inexistente → NOT_FOUND', async () => {
      expect(
        codeOf(await deleteCategory(kit.deps, { id: '00000000-0000-4000-8000-0000000eeeee' })),
      ).toBe('NOT_FOUND');
    });
  });

  describe('listCategories', () => {
    it('[RF-CAT-06] lista ordenada pelo nome normalizado (sem acento e caixa)', async () => {
      const localKit = await createCatalogTestKit();
      try {
        for (const name of ['zebra', 'Árvore', 'banana', 'Ábaco']) {
          await createCategory(localKit.deps, { name });
        }

        const list = await listCategories(localKit.deps);

        expect(list.map((c) => c.name)).toEqual(['Ábaco', 'Árvore', 'banana', 'zebra']);
      } finally {
        await localKit.close();
      }
    }, 90_000);
  });
});
