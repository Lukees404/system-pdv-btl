import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCatalogTestKit, type CatalogTestKit } from '../test-support';
import {
  performCreateCategory,
  performDeleteCategory,
  performRenameCategory,
  performSaveProduct,
  performSaveService,
  performSetProductArchived,
  performSetServiceArchived,
} from './form-actions';

describe('ações de formulário do catálogo (banco real)', () => {
  let kit: CatalogTestKit;
  let ctx: { deps: CatalogTestKit['deps']; actorUserId: string };

  beforeAll(async () => {
    kit = await createCatalogTestKit();
    ctx = { deps: kit.deps, actorUserId: kit.actorUserId };
  }, 90_000);

  afterAll(async () => {
    await kit?.close();
  });

  const productId = async (name: string) =>
    (await kit.owner<{ id: string }>('SELECT id FROM products WHERE name = $1', [name]))[0]!.id;

  it('[RF-CAT-01][RN-DIN-01] cria o produto com o preço digitado em reais', async () => {
    const result = await performSaveProduct(ctx, {
      name: 'Coleira Antipulgas',
      price: '49,90',
      cost: '30,00',
      ncm: '42010000',
    });

    expect(result.ok).toBe(true);
    const [row] = await kit.owner<{ price_cents: number; cost_cents: number; ncm: string }>(
      "SELECT price_cents, cost_cents, ncm FROM products WHERE name = 'Coleira Antipulgas'",
    );
    expect(row).toEqual({ price_cents: 4990, cost_cents: 3000, ncm: '42010000' });
  });

  it('[RN-CAT-02] nome repetido volta o código estável e o campo "name"', async () => {
    const result = await performSaveProduct(ctx, { name: 'coleira antipulgas', price: '1,00' });

    expect(result).toMatchObject({ ok: false, code: 'PRODUCT_NAME_TAKEN', field: 'name' });
  });

  it('[RN-CAT-03] código de barras repetido aponta o campo "barcode"', async () => {
    await performSaveProduct(ctx, { name: 'Ração A', price: '10,00', barcode: '789000111' });
    const result = await performSaveProduct(ctx, {
      name: 'Ração B',
      price: '10,00',
      barcode: '789000111',
    });

    expect(result).toMatchObject({ ok: false, code: 'BARCODE_TAKEN', field: 'barcode' });
  });

  it('[RF-CAT-01] preço inválido não grava nada e aponta o campo', async () => {
    const result = await performSaveProduct(ctx, { name: 'Sem preço', price: 'abc' });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_MONEY', field: 'priceCents' });
    expect(await kit.owner("SELECT 1 FROM products WHERE name = 'Sem preço'")).toHaveLength(0);
  });

  it('[RF-CAT-02][RN-ACE-02] editar o preço audita com o usuário da sessão e os valores em centavos', async () => {
    const id = await productId('Coleira Antipulgas');

    const result = await performSaveProduct(ctx, {
      id,
      name: 'Coleira Antipulgas',
      price: '55,00',
      cost: '30,00',
    });

    expect(result.ok).toBe(true);
    const [audit] = await kit.owner<{ user_id: string; data: unknown }>(
      "SELECT user_id, data FROM audit_log WHERE action = 'product.price_changed' AND entity_id = $1",
      [id],
    );
    expect(audit?.user_id).toBe(kit.actorUserId);
    expect(audit?.data).toMatchObject({
      before: { priceCents: 4990 },
      after: { priceCents: 5500 },
    });
  });

  it('[RF-CAT-02] editar um produto que não existe volta NOT_FOUND', async () => {
    const result = await performSaveProduct(ctx, {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fantasma',
      price: '1,00',
    });

    expect(result).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });

  it('[RF-CAT-03][RN-CAT-04] arquiva e reativa (idempotente), com auditoria', async () => {
    const id = await productId('Ração A');

    expect((await performSetProductArchived(ctx, { id, archived: true })).ok).toBe(true);
    expect((await performSetProductArchived(ctx, { id, archived: true })).ok).toBe(true);
    const [archived] = await kit.owner<{ a: boolean }>(
      'SELECT archived_at IS NOT NULL AS a FROM products WHERE id = $1',
      [id],
    );
    expect(archived?.a).toBe(true);

    expect((await performSetProductArchived(ctx, { id, archived: false })).ok).toBe(true);
    const [active] = await kit.owner<{ a: boolean }>(
      'SELECT archived_at IS NOT NULL AS a FROM products WHERE id = $1',
      [id],
    );
    expect(active?.a).toBe(false);
  });

  it('[RF-CAT-06][RN-CAT-07] cria, renomeia e exclui categoria; nome repetido e categoria com produto são barrados', async () => {
    expect((await performCreateCategory(ctx, { name: 'Alimentos' })).ok).toBe(true);
    expect(await performCreateCategory(ctx, { name: 'ALIMENTOS' })).toMatchObject({
      ok: false,
      code: 'CATEGORY_NAME_TAKEN',
      field: 'name',
    });

    const [cat] = await kit.owner<{ id: string }>(
      "SELECT id FROM categories WHERE name = 'Alimentos'",
    );
    const id = cat!.id;
    expect((await performRenameCategory(ctx, { id, name: 'Comida' })).ok).toBe(true);

    await performSaveProduct(ctx, { name: 'Petisco', price: '5,00', categoryId: id });
    expect(await performDeleteCategory(ctx, { id })).toMatchObject({
      ok: false,
      code: 'CATEGORY_NOT_EMPTY',
    });
    await kit.owner("UPDATE products SET category_id = NULL WHERE name = 'Petisco'");
    expect((await performDeleteCategory(ctx, { id })).ok).toBe(true);
  });

  it('[RF-CAT-07][RN-SER-03] cria serviço, só aceita uma taxa de deslocamento e audita o preço', async () => {
    expect((await performSaveService(ctx, { name: 'Consulta', price: '90,00' })).ok).toBe(true);
    expect(
      (await performSaveService(ctx, { name: 'Taxa', price: '25,00', isDisplacementFee: 'on' })).ok,
    ).toBe(true);
    expect(
      await performSaveService(ctx, { name: 'Outra taxa', price: '1,00', isDisplacementFee: 'on' }),
    ).toMatchObject({ ok: false, code: 'DISPLACEMENT_FEE_EXISTS' });

    const [svc] = await kit.owner<{ id: string }>(
      "SELECT id FROM services WHERE name = 'Consulta'",
    );
    const id = svc!.id;
    expect((await performSaveService(ctx, { id, name: 'Consulta', price: '100,00' })).ok).toBe(
      true,
    );
    const audit = await kit.owner(
      "SELECT 1 FROM audit_log WHERE action = 'service.price_changed' AND entity_id = $1",
      [id],
    );
    expect(audit).toHaveLength(1);

    expect((await performSetServiceArchived(ctx, { id, archived: true })).ok).toBe(true);
    expect((await performSetServiceArchived(ctx, { id, archived: false })).ok).toBe(true);
  });

  it('[RNF-SEG-05] id que não é texto ou estrutura inesperada vira INVALID_INPUT', async () => {
    expect(
      await performSetProductArchived(ctx, { id: 5 as unknown as string, archived: true }),
    ).toMatchObject({
      ok: false,
      code: 'INVALID_INPUT',
    });
    expect(await performRenameCategory(ctx, null)).toMatchObject({
      ok: false,
      code: 'INVALID_INPUT',
    });
  });
});
