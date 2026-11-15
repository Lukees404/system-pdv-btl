import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaCatalogUnitOfWork } from '../infrastructure/prisma-catalog-unit-of-work';
import { createCatalogTestKit, type CatalogTestKit } from '../test-support';
import { archiveProduct } from './archive-product';
import { createProduct } from './create-product';
import { getProduct } from './get-product';
import { reactivateProduct } from './reactivate-product';
import { searchProducts } from './search-products';
import { updateProduct } from './update-product';

type AnyResult = { ok: boolean; error?: { code: string } };
const codeOf = (result: AnyResult) => (result.ok ? null : (result.error?.code ?? null));

describe('produtos (banco real)', () => {
  let kit: CatalogTestKit;

  beforeAll(async () => {
    kit = await createCatalogTestKit();
  }, 90_000);
  afterAll(async () => {
    await kit.close();
  });

  const create = async (input: Parameters<typeof createProduct>[1]) => {
    const result = await createProduct(kit.deps, input);
    return result.ok ? result.value.id : (null as never);
  };

  const auditOf = (entityId: string) =>
    kit.owner<{ action: string; user_id: string; entity_type: string; data: unknown }>(
      'SELECT action, user_id, entity_type, data FROM audit_log WHERE entity_id = $1 ORDER BY id',
      [entityId],
    );

  const row = async (id: string) =>
    (await kit.owner<Record<string, unknown>>('SELECT * FROM products WHERE id = $1', [id]))[0]!;

  describe('createProduct', () => {
    it('[RF-CAT-01][RN-CAT-01] nasce ativo, com estoque 0 e os dados limpos', async () => {
      const result = await createProduct(kit.deps, {
        name: '  Coleira Antipulgas ',
        priceCents: 4990,
        costCents: 2500,
        minStock: 3,
        barcode: ' 7891000100103 ',
        ncm: '23091000',
      });

      expect(result.ok).toBe(true);
      expect(await row(result.ok ? result.value.id : '')).toMatchObject({
        name: 'Coleira Antipulgas',
        name_normalized: 'coleira antipulgas',
        barcode: '7891000100103',
        price_cents: 4990,
        cost_cents: 2500,
        stock_qty: 0,
        min_stock: 3,
        ncm: '23091000',
        unit: 'UN',
        archived_at: null,
        category_id: null,
      });
    });

    it('[RF-CAT-01][RN-CAT-02] nome repetido entre ativos (sem acento e caixa) → PRODUCT_NAME_TAKEN', async () => {
      await create({ name: 'Ração Premium', priceCents: 1000 });

      expect(codeOf(await createProduct(kit.deps, { name: 'RACAO premium', priceCents: 1 }))).toBe(
        'PRODUCT_NAME_TAKEN',
      );
    });

    it('[RN-CAT-02] um nome usado só por produto ARQUIVADO está livre para um novo cadastro', async () => {
      const id = await create({ name: 'Brinquedo Antigo', priceCents: 1000 });
      await archiveProduct(kit.deps, { id, actorUserId: kit.actorUserId });

      expect(
        (await createProduct(kit.deps, { name: 'brinquedo antigo', priceCents: 1000 })).ok,
      ).toBe(true);
    });

    it('[RF-CAT-01][RN-CAT-03] código de barras repetido → BARCODE_TAKEN, inclusive o de um produto arquivado', async () => {
      const id = await create({ name: 'Com Código A', priceCents: 1, barcode: '1111111111111' });

      expect(
        codeOf(
          await createProduct(kit.deps, {
            name: 'Com Código B',
            priceCents: 1,
            barcode: '1111111111111',
          }),
        ),
      ).toBe('BARCODE_TAKEN');

      await archiveProduct(kit.deps, { id, actorUserId: kit.actorUserId });
      expect(
        codeOf(
          await createProduct(kit.deps, {
            name: 'Com Código C',
            priceCents: 1,
            barcode: '1111111111111',
          }),
        ),
      ).toBe('BARCODE_TAKEN');
    });

    it('[RN-CAT-03] vários produtos sem código de barras convivem (nulo não conflita)', async () => {
      expect((await createProduct(kit.deps, { name: 'Sem Código 1', priceCents: 1 })).ok).toBe(
        true,
      );
      expect((await createProduct(kit.deps, { name: 'Sem Código 2', priceCents: 1 })).ok).toBe(
        true,
      );
    });

    it('[RN-CAT-01] dados inválidos são recusados pelo domínio e NADA é gravado', async () => {
      const before = await kit.owner('SELECT 1 FROM products');

      expect(codeOf(await createProduct(kit.deps, { name: 'Preço Ruim', priceCents: -1 }))).toBe(
        'INVALID_MONEY',
      );
      expect(await kit.owner('SELECT 1 FROM products')).toHaveLength(before.length);
    });

    it('[RN-CAT-01] categoria inexistente → CATEGORY_NOT_FOUND', async () => {
      expect(
        codeOf(
          await createProduct(kit.deps, {
            name: 'Sem Categoria Válida',
            priceCents: 1,
            categoryId: '00000000-0000-4000-8000-0000000aaaaa',
          }),
        ),
      ).toBe('CATEGORY_NOT_FOUND');
    });

    it('[RN-CAT-02] dois cadastros simultâneos do mesmo nome: um vence, o outro recebe PRODUCT_NAME_TAKEN', async () => {
      const results = await Promise.all([
        createProduct(kit.deps, { name: 'Corrida de Cadastro', priceCents: 1 }),
        createProduct(kit.deps, { name: 'corrida de cadastro', priceCents: 1 }),
      ]);

      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.map(codeOf).filter(Boolean)).toEqual(['PRODUCT_NAME_TAKEN']);
    });
  });

  describe('updateProduct', () => {
    const base = { name: 'Shampoo Neutro', priceCents: 2000, costCents: 1000 };

    it('[RF-CAT-02] edita os dados e NÃO mexe no estoque nem na data de criação', async () => {
      const id = await create({ ...base, name: 'Shampoo Para Editar' });
      await kit.owner('UPDATE products SET stock_qty = 7 WHERE id = $1', [id]);
      kit.clock.advance(60_000);

      const result = await updateProduct(kit.deps, {
        id,
        actorUserId: kit.actorUserId,
        name: 'Shampoo Editado',
        priceCents: 2000,
        costCents: 1000,
        minStock: 4,
      });

      expect(result.ok).toBe(true);
      expect(await row(id)).toMatchObject({
        name: 'Shampoo Editado',
        name_normalized: 'shampoo editado',
        min_stock: 4,
        stock_qty: 7,
      });
      expect((await row(id)).updated_at).toEqual(kit.clock.now());
      expect((await row(id)).created_at).not.toEqual(kit.clock.now());
    });

    it('[RF-CAT-02][RN-ACE-02][RN-CAT-05] mudar o preço grava product.price_changed (antes/depois, em centavos, só ids)', async () => {
      const id = await create({ ...base, name: 'Shampoo Preço' });

      await updateProduct(kit.deps, {
        id,
        actorUserId: kit.actorUserId,
        ...base,
        name: 'Shampoo Preço',
        priceCents: 2500,
      });

      expect(await auditOf(id)).toEqual([
        {
          action: 'product.price_changed',
          user_id: kit.actorUserId,
          entity_type: 'product',
          data: {
            before: { priceCents: 2000, costCents: 1000 },
            after: { priceCents: 2500, costCents: 1000 },
          },
        },
      ]);
    });

    it('[RF-CAT-02][RN-ACE-02] mudar só o custo também é auditado (inclusive de "sem custo" para um valor)', async () => {
      const id = await create({ name: 'Shampoo Custo', priceCents: 2000 });

      await updateProduct(kit.deps, {
        id,
        actorUserId: kit.actorUserId,
        name: 'Shampoo Custo',
        priceCents: 2000,
        costCents: 900,
      });

      const [entry] = await auditOf(id);
      expect(entry?.data).toEqual({
        before: { priceCents: 2000, costCents: null },
        after: { priceCents: 2000, costCents: 900 },
      });
    });

    it('[RF-CAT-02][RN-ACE-02] mudar só o nome (ou salvar sem mudar preço/custo) NÃO audita', async () => {
      const id = await create({ ...base, name: 'Shampoo Sem Auditoria' });

      await updateProduct(kit.deps, {
        id,
        actorUserId: kit.actorUserId,
        ...base,
        name: 'Shampoo Renomeado',
      });
      await updateProduct(kit.deps, {
        id,
        actorUserId: kit.actorUserId,
        ...base,
        name: 'Shampoo Renomeado',
      });

      expect(await auditOf(id)).toHaveLength(0);
    });

    it('[RN-ACE-02] a auditoria entra na MESMA transação: se ela falha, a alteração de preço é desfeita', async () => {
      const id = await create({ ...base, name: 'Shampoo Atômico' });
      const failingUow = new PrismaCatalogUnitOfWork(kit.db, {
        createAudit: () => ({
          record: async () => {
            throw new Error('falha na auditoria');
          },
        }),
      });

      await expect(
        updateProduct(
          { ...kit.deps, uow: failingUow },
          { id, actorUserId: kit.actorUserId, ...base, name: 'Shampoo Atômico', priceCents: 9999 },
        ),
      ).rejects.toThrow('falha na auditoria');

      expect((await row(id)).price_cents).toBe(2000);
    });

    it('[RN-CAT-02] renomear para o nome de OUTRO produto ativo → PRODUCT_NAME_TAKEN e nada muda; mudar a própria caixa/acento pode', async () => {
      await create({ name: 'Petisco Original', priceCents: 1 });
      const id = await create({ name: 'Petisco Outro', priceCents: 1 });

      expect(
        codeOf(
          await updateProduct(kit.deps, {
            id,
            actorUserId: kit.actorUserId,
            name: 'PETISCO ORIGINAL',
            priceCents: 1,
          }),
        ),
      ).toBe('PRODUCT_NAME_TAKEN');
      expect((await row(id)).name).toBe('Petisco Outro');

      expect(
        (
          await updateProduct(kit.deps, {
            id,
            actorUserId: kit.actorUserId,
            name: 'PETISCO OUTRO',
            priceCents: 1,
          })
        ).ok,
      ).toBe(true);
    });

    it('[RN-CAT-03] trocar para o código de barras de outro produto → BARCODE_TAKEN; manter o próprio é permitido', async () => {
      await create({ name: 'Código Dono', priceCents: 1, barcode: '2222222222222' });
      const id = await create({ name: 'Código Outro', priceCents: 1, barcode: '3333333333333' });

      expect(
        codeOf(
          await updateProduct(kit.deps, {
            id,
            actorUserId: kit.actorUserId,
            name: 'Código Outro',
            priceCents: 1,
            barcode: '2222222222222',
          }),
        ),
      ).toBe('BARCODE_TAKEN');
      expect(
        (
          await updateProduct(kit.deps, {
            id,
            actorUserId: kit.actorUserId,
            name: 'Código Outro',
            priceCents: 1,
            barcode: '3333333333333',
          })
        ).ok,
      ).toBe(true);
    });

    it('[RF-CAT-02] produto inexistente → NOT_FOUND; dados inválidos → erro do domínio, sem alterar', async () => {
      const id = await create({ name: 'Para Validar', priceCents: 100 });

      expect(
        codeOf(
          await updateProduct(kit.deps, {
            id: '00000000-0000-4000-8000-0000000bbbbb',
            actorUserId: kit.actorUserId,
            name: 'Qualquer',
            priceCents: 1,
          }),
        ),
      ).toBe('NOT_FOUND');
      expect(
        codeOf(
          await updateProduct(kit.deps, {
            id,
            actorUserId: kit.actorUserId,
            name: 'Para Validar',
            priceCents: -5,
          }),
        ),
      ).toBe('INVALID_MONEY');
      expect((await row(id)).price_cents).toBe(100);
    });

    it('[RF-CAT-02] produto arquivado pode ser editado (e continua arquivado)', async () => {
      const id = await create({ name: 'Arquivado Editável', priceCents: 100 });
      await archiveProduct(kit.deps, { id, actorUserId: kit.actorUserId });

      const result = await updateProduct(kit.deps, {
        id,
        actorUserId: kit.actorUserId,
        name: 'Arquivado Editável',
        priceCents: 150,
      });

      expect(result.ok).toBe(true);
      expect((await row(id)).archived_at).not.toBeNull();
    });
  });

  describe('archiveProduct / reactivateProduct', () => {
    it('[RF-CAT-03][RN-CAT-04][RN-ACE-02] arquivar grava archived_at e product.archived; a linha nunca é apagada', async () => {
      const id = await create({ name: 'Para Arquivar', priceCents: 1 });

      const result = await archiveProduct(kit.deps, { id, actorUserId: kit.actorUserId });

      expect(result.ok).toBe(true);
      expect((await row(id)).archived_at).toEqual(kit.clock.now());
      expect(await auditOf(id)).toEqual([
        {
          action: 'product.archived',
          user_id: kit.actorUserId,
          entity_type: 'product',
          data: { productId: id },
        },
      ]);
    });

    it('[RF-CAT-03] arquivar duas vezes é seguro: não duplica a auditoria nem muda a data', async () => {
      const id = await create({ name: 'Arquivar Duas Vezes', priceCents: 1 });
      await archiveProduct(kit.deps, { id, actorUserId: kit.actorUserId });
      const firstDate = (await row(id)).archived_at;
      kit.clock.advance(3_600_000);

      expect((await archiveProduct(kit.deps, { id, actorUserId: kit.actorUserId })).ok).toBe(true);

      expect((await row(id)).archived_at).toEqual(firstDate);
      expect(await auditOf(id)).toHaveLength(1);
    });

    it('[RF-CAT-03][RN-ACE-02] reativar limpa archived_at e grava product.reactivated', async () => {
      const id = await create({ name: 'Para Reativar', priceCents: 1 });
      await archiveProduct(kit.deps, { id, actorUserId: kit.actorUserId });

      const result = await reactivateProduct(kit.deps, { id, actorUserId: kit.actorUserId });

      expect(result.ok).toBe(true);
      expect((await row(id)).archived_at).toBeNull();
      expect((await auditOf(id)).map((e) => e.action)).toEqual([
        'product.archived',
        'product.reactivated',
      ]);
    });

    it('[RN-CAT-02] reativar com o nome já tomado por outro ativo → PRODUCT_NAME_TAKEN e continua arquivado', async () => {
      const id = await create({ name: 'Nome Disputado', priceCents: 1 });
      await archiveProduct(kit.deps, { id, actorUserId: kit.actorUserId });
      await create({ name: 'nome disputado', priceCents: 1 });

      expect(codeOf(await reactivateProduct(kit.deps, { id, actorUserId: kit.actorUserId }))).toBe(
        'PRODUCT_NAME_TAKEN',
      );
      expect((await row(id)).archived_at).not.toBeNull();
      expect((await auditOf(id)).map((e) => e.action)).toEqual(['product.archived']);
    });

    it('[RF-CAT-03] reativar quem já está ativo é seguro (sem auditoria); produto inexistente → NOT_FOUND', async () => {
      const id = await create({ name: 'Já Ativo', priceCents: 1 });

      expect((await reactivateProduct(kit.deps, { id, actorUserId: kit.actorUserId })).ok).toBe(
        true,
      );
      expect(await auditOf(id)).toHaveLength(0);
      for (const action of [archiveProduct, reactivateProduct]) {
        expect(
          codeOf(
            await action(kit.deps, {
              id: '00000000-0000-4000-8000-0000000ccccc',
              actorUserId: kit.actorUserId,
            }),
          ),
        ).toBe('NOT_FOUND');
      }
    });
  });

  describe('getProduct', () => {
    it('[RF-CAT-02] devolve o produto (com estoque e campos fiscais) ou null', async () => {
      const id = await create({ name: 'Para Buscar Por Id', priceCents: 777, ncm: '23091000' });

      expect(await getProduct(kit.deps, { id })).toMatchObject({
        id,
        name: 'Para Buscar Por Id',
        priceCents: 777,
        stockQty: 0,
        ncm: '23091000',
        archivedAt: null,
      });
      expect(await getProduct(kit.deps, { id: '00000000-0000-4000-8000-0000000ddddd' })).toBeNull();
    });
  });

  describe('searchProducts', () => {
    let search: CatalogTestKit;

    beforeAll(async () => {
      search = await createCatalogTestKit();
      const make = (input: Parameters<typeof createProduct>[1]) =>
        createProduct(search.deps, input);
      await make({ name: 'Coleira Antipulgas', priceCents: 4990 });
      await make({ name: 'Ração Premium Adulto', priceCents: 10000 });
      await make({ name: 'Areia Sanitária', priceCents: 3000 });
      await make({ name: 'Areia Fina', priceCents: 2500 });
      await make({ name: 'Caixa de Areia', priceCents: 8000 });
      await make({ name: 'Desconto 50% Brinquedo', priceCents: 1000 });
      await make({ name: 'Item axb', priceCents: 1000 });
      await make({ name: 'Item a_b', priceCents: 1000 });
      await make({ name: 'Produto 789', priceCents: 1000 });
      await make({ name: 'Leitor Código', priceCents: 1000, barcode: '789' });
      const old = await make({ name: 'Produto Arquivado Raro', priceCents: 1 });
      await archiveProduct(search.deps, {
        id: old.ok ? old.value.id : '',
        actorUserId: search.actorUserId,
      });
    }, 90_000);
    afterAll(async () => {
      await search.close();
    });

    const names = async (input: Parameters<typeof searchProducts>[1]) =>
      (await searchProducts(search.deps, input)).map((p) => p.name);

    it('[RF-CAT-04] acha por parte do nome, sem diferença de acento e caixa', async () => {
      expect(await names({ query: 'COLEIRA' })).toEqual(['Coleira Antipulgas']);
      expect(await names({ query: 'racao' })).toEqual(['Ração Premium Adulto']);
      expect(await names({ query: 'sanitaria' })).toEqual(['Areia Sanitária']);
    });

    it('[RF-CAT-04] espaços repetidos no termo não atrapalham', async () => {
      expect(await names({ query: '  racao    premium ' })).toEqual(['Ração Premium Adulto']);
    });

    it('[RF-CAT-04] ordena por relevância: começa com o termo vem antes de só conter', async () => {
      expect(await names({ query: 'areia' })).toEqual([
        'Areia Fina',
        'Areia Sanitária',
        'Caixa de Areia',
      ]);
    });

    it('[RF-CAT-04][RN-CAT-03] código de barras exato vem em primeiro, antes de nomes que contêm o termo', async () => {
      expect((await names({ query: '789' }))[0]).toBe('Leitor Código');
      expect(await names({ query: '789' })).toContain('Produto 789');
    });

    it('[RF-CAT-04] % e _ do termo valem como texto literal, não como curinga', async () => {
      expect(await names({ query: '50%' })).toEqual(['Desconto 50% Brinquedo']);
      expect(await names({ query: 'a_b' })).toEqual(['Item a_b']);
    });

    it('[RF-CAT-03][RN-CAT-04] arquivados ficam fora da busca da venda, mas aparecem na gestão (includeArchived)', async () => {
      expect(await names({ query: 'raro' })).toEqual([]);
      expect(await names({ query: 'raro', includeArchived: true })).toEqual([
        'Produto Arquivado Raro',
      ]);
    });

    it('[RF-CAT-04] sem termo lista os ativos por nome, com paginação (limite e deslocamento)', async () => {
      const all = await names({});
      const firstPage = await names({ limit: 3 });
      const secondPage = await names({ limit: 3, offset: 3 });

      expect(all).not.toContain('Produto Arquivado Raro');
      expect(all).toEqual([...all].sort((a, b) => a.localeCompare(b, 'pt-BR')));
      expect(firstPage).toEqual(all.slice(0, 3));
      expect(secondPage).toEqual(all.slice(3, 6));
    });

    it('[RF-CAT-04] o limite tem teto de 100 e nunca é negativo', async () => {
      expect((await names({ limit: 5000 })).length).toBeLessThanOrEqual(100);
      expect((await names({ limit: -5 })).length).toBeGreaterThanOrEqual(1);
    });
  });
});
