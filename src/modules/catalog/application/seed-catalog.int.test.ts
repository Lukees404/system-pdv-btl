import { afterAll, describe, expect, it } from 'vitest';
import { createCatalogTestKit, type CatalogTestKit } from '../test-support';
import { archiveService } from './archive-service';
import { createCategory } from './create-category';
import { createService } from './create-service';
import { seedCatalog, type SeedCatalogInput } from './seed-catalog';
import { updateService } from './update-service';

const INPUT: SeedCatalogInput = {
  categories: ['Alimentos', 'Acessórios'],
  services: [
    { name: 'Consulta', priceCents: 0 },
    { name: 'Vacinação', priceCents: 0 },
    { name: 'Taxa de deslocamento', priceCents: 0, isDisplacementFee: true },
  ],
};

describe('seedCatalog (banco real)', () => {
  let kit: CatalogTestKit;

  // Cada teste começa de um banco vazio, porque o seed depende do que já existe.
  afterAll(async () => {
    await kit?.close();
  });

  const fresh = async () => {
    await kit?.close();
    kit = await createCatalogTestKit();
    return kit;
  };

  const services = (k: CatalogTestKit) =>
    k.owner<{ name: string; price_cents: number; is_displacement_fee: boolean; archived: boolean }>(
      `SELECT name, price_cents, is_displacement_fee, archived_at IS NOT NULL AS archived
         FROM services ORDER BY name_normalized`,
    );
  const categories = (k: CatalogTestKit) =>
    k.owner<{ name: string }>('SELECT name FROM categories ORDER BY name_normalized');

  it('[RN-SER-01][RN-SER-03][RN-CAT-07] cria as categorias e os serviços, com a taxa de deslocamento marcada', async () => {
    const k = await fresh();

    const report = await seedCatalog(k.deps, INPUT);

    expect(report).toEqual({
      categories: { created: 2, skipped: 0 },
      services: { created: 3, skipped: 0 },
    });
    expect((await categories(k)).map((c) => c.name)).toEqual(['Acessórios', 'Alimentos']);
    expect(await services(k)).toEqual([
      { name: 'Consulta', price_cents: 0, is_displacement_fee: false, archived: false },
      { name: 'Taxa de deslocamento', price_cents: 0, is_displacement_fee: true, archived: false },
      { name: 'Vacinação', price_cents: 0, is_displacement_fee: false, archived: false },
    ]);
  }, 90_000);

  it('[RN-CAT-07][RN-SER-01] rodar duas vezes não duplica nada (idempotente)', async () => {
    const k = await fresh();
    await seedCatalog(k.deps, INPUT);

    const second = await seedCatalog(k.deps, INPUT);

    expect(second).toEqual({
      categories: { created: 0, skipped: 2 },
      services: { created: 0, skipped: 3 },
    });
    expect(await categories(k)).toHaveLength(2);
    expect(await services(k)).toHaveLength(3);
  }, 90_000);

  it('[RN-SER-01] o seed NUNCA mexe num preço que o dono já editou', async () => {
    const k = await fresh();
    await seedCatalog(k.deps, INPUT);
    const [row] = await k.owner<{ id: string }>("SELECT id FROM services WHERE name = 'Consulta'");
    await updateService(k.deps, {
      id: row!.id,
      actorUserId: k.actorUserId,
      name: 'Consulta',
      priceCents: 9000,
    });

    await seedCatalog(k.deps, INPUT);

    const consulta = (await services(k)).find((s) => s.name === 'Consulta');
    expect(consulta?.price_cents).toBe(9000);
  }, 90_000);

  it('[RN-CAT-04] não recria um serviço que o dono ARQUIVOU (arquivar libera o nome, mas o seed respeita)', async () => {
    const k = await fresh();
    await seedCatalog(k.deps, INPUT);
    const [row] = await k.owner<{ id: string }>("SELECT id FROM services WHERE name = 'Vacinação'");
    await archiveService(k.deps, { id: row!.id, actorUserId: k.actorUserId });

    const report = await seedCatalog(k.deps, INPUT);

    expect(report.services).toEqual({ created: 0, skipped: 3 });
    expect((await services(k)).filter((s) => s.name === 'Vacinação')).toHaveLength(1);
  }, 90_000);

  it('[RN-CAT-07][RN-SER-01] reconhece o que já existe sem diferença de acento e caixa', async () => {
    const k = await fresh();
    await createCategory(k.deps, { name: 'ACESSORIOS' });
    await createService(k.deps, { name: 'vacinacao', priceCents: 12000 });

    const report = await seedCatalog(k.deps, INPUT);

    expect(report.categories).toEqual({ created: 1, skipped: 1 });
    expect(report.services).toEqual({ created: 2, skipped: 1 });
    expect((await services(k)).find((s) => s.name === 'vacinacao')?.price_cents).toBe(12000);
  }, 90_000);

  it('[RN-SER-03] se já existe uma taxa de deslocamento com outro nome, o seed pula a dele sem falhar', async () => {
    const k = await fresh();
    await createService(k.deps, {
      name: 'Deslocamento até a casa',
      priceCents: 2500,
      isDisplacementFee: true,
    });

    const report = await seedCatalog(k.deps, INPUT);

    expect(report.services).toEqual({ created: 2, skipped: 1 });
    expect((await services(k)).filter((s) => s.is_displacement_fee)).toHaveLength(1);
  }, 90_000);
});
