import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaCatalogUnitOfWork } from '../infrastructure/prisma-catalog-unit-of-work';
import { createCatalogTestKit, type CatalogTestKit } from '../test-support';
import { archiveService } from './archive-service';
import { createService } from './create-service';
import { listServices } from './list-services';
import { reactivateService } from './reactivate-service';
import { updateService } from './update-service';

type AnyResult = { ok: boolean; error?: { code: string } };
const codeOf = (result: AnyResult) => (result.ok ? null : (result.error?.code ?? null));

describe('serviços (banco real)', () => {
  let kit: CatalogTestKit;

  beforeAll(async () => {
    kit = await createCatalogTestKit();
  }, 90_000);
  afterAll(async () => {
    await kit.close();
  });

  const create = async (input: Parameters<typeof createService>[1]) => {
    const result = await createService(kit.deps, input);
    return result.ok ? result.value.id : (null as never);
  };

  const row = async (id: string) =>
    (await kit.owner<Record<string, unknown>>('SELECT * FROM services WHERE id = $1', [id]))[0]!;

  const auditOf = (entityId: string) =>
    kit.owner<{ action: string; user_id: string; entity_type: string; data: unknown }>(
      'SELECT action, user_id, entity_type, data FROM audit_log WHERE entity_id = $1 ORDER BY id',
      [entityId],
    );

  describe('createService', () => {
    it('[RF-CAT-07][RN-SER-01] cria o serviço ativo, com o nome aparado e normalizado', async () => {
      const result = await createService(kit.deps, { name: ' Vacinação ', priceCents: 12000 });

      expect(result.ok).toBe(true);
      expect(await row(result.ok ? result.value.id : '')).toMatchObject({
        name: 'Vacinação',
        name_normalized: 'vacinacao',
        price_cents: 12000,
        is_displacement_fee: false,
        fiscal_service_code: null,
        archived_at: null,
      });
    });

    it('[RN-SER-01] nome repetido entre ativos (sem acento e caixa) → SERVICE_NAME_TAKEN', async () => {
      await create({ name: 'Limpeza de ouvido', priceCents: 5000 });

      expect(
        codeOf(await createService(kit.deps, { name: 'LIMPEZA DE OUVIDO', priceCents: 1 })),
      ).toBe('SERVICE_NAME_TAKEN');
    });

    it('[RN-SER-03] só existe UMA taxa de deslocamento: a segunda → DISPLACEMENT_FEE_EXISTS', async () => {
      const first = await createService(kit.deps, {
        name: 'Taxa de deslocamento',
        priceCents: 3000,
        isDisplacementFee: true,
      });

      expect(first.ok).toBe(true);
      expect(
        codeOf(
          await createService(kit.deps, {
            name: 'Outra taxa',
            priceCents: 1,
            isDisplacementFee: true,
          }),
        ),
      ).toBe('DISPLACEMENT_FEE_EXISTS');
    });

    it('[RN-SER-03] duas taxas criadas ao mesmo tempo: uma vence e a outra recebe DISPLACEMENT_FEE_EXISTS', async () => {
      const localKit = await createCatalogTestKit();
      try {
        const results = await Promise.all([
          createService(localKit.deps, { name: 'Taxa A', priceCents: 1, isDisplacementFee: true }),
          createService(localKit.deps, { name: 'Taxa B', priceCents: 1, isDisplacementFee: true }),
        ]);

        expect(results.filter((r) => r.ok)).toHaveLength(1);
        expect(results.map(codeOf).filter(Boolean)).toEqual(['DISPLACEMENT_FEE_EXISTS']);
      } finally {
        await localKit.close();
      }
    }, 90_000);

    it('[RN-SER-01] nome de serviço ARQUIVADO está livre; dados inválidos não gravam nada', async () => {
      const id = await create({ name: 'Raspado Antigo', priceCents: 1000 });
      await archiveService(kit.deps, { id, actorUserId: kit.actorUserId });

      expect((await createService(kit.deps, { name: 'raspado antigo', priceCents: 1 })).ok).toBe(
        true,
      );
      expect(codeOf(await createService(kit.deps, { name: 'Preço Ruim', priceCents: -1 }))).toBe(
        'INVALID_MONEY',
      );
    });
  });

  describe('updateService', () => {
    it('[RF-CAT-07] edita nome, preço e código fiscal; a marca de taxa de deslocamento não muda', async () => {
      // Banco próprio: a taxa de deslocamento é única e o banco compartilhado já tem a sua.
      const localKit = await createCatalogTestKit();
      try {
        const actor = { actorUserId: localKit.actorUserId };
        const make = async (input: Parameters<typeof createService>[1]) => {
          const result = await createService(localKit.deps, input);
          return result.ok ? result.value.id : (null as never);
        };
        const common = await make({ name: 'Serviço Editável', priceCents: 3000 });
        const fee = await make({ name: 'Taxa Real', priceCents: 3000, isDisplacementFee: true });

        await updateService(localKit.deps, {
          id: common,
          ...actor,
          name: 'Consulta Domiciliar',
          priceCents: 9000,
          fiscalServiceCode: ' 08.01 ',
        });
        await updateService(localKit.deps, {
          id: fee,
          ...actor,
          name: 'Taxa Real',
          priceCents: 3500,
        });

        const read = async (id: string) =>
          (
            await localKit.owner<Record<string, unknown>>('SELECT * FROM services WHERE id = $1', [
              id,
            ])
          )[0]!;
        expect(await read(common)).toMatchObject({
          name: 'Consulta Domiciliar',
          name_normalized: 'consulta domiciliar',
          price_cents: 9000,
          fiscal_service_code: '08.01',
          is_displacement_fee: false,
        });
        expect(await read(fee)).toMatchObject({ price_cents: 3500, is_displacement_fee: true });
      } finally {
        await localKit.close();
      }
    }, 90_000);

    it('[RF-CAT-07][RN-ACE-02] mudar o preço padrão grava service.price_changed (antes/depois, só ids e centavos)', async () => {
      const id = await create({ name: 'Consulta Preço', priceCents: 8000 });

      await updateService(kit.deps, {
        id,
        actorUserId: kit.actorUserId,
        name: 'Consulta Preço',
        priceCents: 9000,
      });

      expect(await auditOf(id)).toEqual([
        {
          action: 'service.price_changed',
          user_id: kit.actorUserId,
          entity_type: 'service',
          data: { before: { priceCents: 8000 }, after: { priceCents: 9000 } },
        },
      ]);
    });

    it('[RF-CAT-07][RN-ACE-02] salvar sem mudar o preço NÃO audita', async () => {
      const id = await create({ name: 'Consulta Sem Auditoria', priceCents: 8000 });

      await updateService(kit.deps, {
        id,
        actorUserId: kit.actorUserId,
        name: 'Consulta Renomeada',
        priceCents: 8000,
      });

      expect(await auditOf(id)).toHaveLength(0);
    });

    it('[RN-ACE-02] a auditoria entra na MESMA transação: se ela falha, o preço volta ao que era', async () => {
      const id = await create({ name: 'Consulta Atômica', priceCents: 8000 });
      const failingUow = new PrismaCatalogUnitOfWork(kit.db, {
        createAudit: () => ({
          record: async () => {
            throw new Error('falha na auditoria');
          },
        }),
      });

      await expect(
        updateService(
          { ...kit.deps, uow: failingUow },
          { id, actorUserId: kit.actorUserId, name: 'Consulta Atômica', priceCents: 1 },
        ),
      ).rejects.toThrow('falha na auditoria');

      expect((await row(id)).price_cents).toBe(8000);
    });

    it('[RN-SER-01] renomear para o nome de OUTRO serviço ativo → SERVICE_NAME_TAKEN; inexistente → NOT_FOUND', async () => {
      await create({ name: 'Nome Já Usado', priceCents: 1 });
      const id = await create({ name: 'Nome Livre', priceCents: 1 });

      expect(
        codeOf(
          await updateService(kit.deps, {
            id,
            actorUserId: kit.actorUserId,
            name: 'NOME JA USADO',
            priceCents: 1,
          }),
        ),
      ).toBe('SERVICE_NAME_TAKEN');
      expect(
        codeOf(
          await updateService(kit.deps, {
            id: '00000000-0000-4000-8000-0000000fffff',
            actorUserId: kit.actorUserId,
            name: 'Qualquer',
            priceCents: 1,
          }),
        ),
      ).toBe('NOT_FOUND');
    });
  });

  describe('archiveService / reactivateService', () => {
    it('[RF-CAT-07][RN-CAT-04][RN-ACE-02] arquivar grava archived_at e service.archived; reativar, service.reactivated', async () => {
      const id = await create({ name: 'Atestado Arquivável', priceCents: 1 });

      expect((await archiveService(kit.deps, { id, actorUserId: kit.actorUserId })).ok).toBe(true);
      expect((await row(id)).archived_at).toEqual(kit.clock.now());
      expect((await reactivateService(kit.deps, { id, actorUserId: kit.actorUserId })).ok).toBe(
        true,
      );
      expect((await row(id)).archived_at).toBeNull();
      expect(await auditOf(id)).toEqual([
        {
          action: 'service.archived',
          user_id: kit.actorUserId,
          entity_type: 'service',
          data: { serviceId: id },
        },
        {
          action: 'service.reactivated',
          user_id: kit.actorUserId,
          entity_type: 'service',
          data: { serviceId: id },
        },
      ]);
    });

    it('[RF-CAT-07] repetir arquivar/reativar é seguro e não duplica a auditoria', async () => {
      const id = await create({ name: 'Idempotente', priceCents: 1 });

      await archiveService(kit.deps, { id, actorUserId: kit.actorUserId });
      await archiveService(kit.deps, { id, actorUserId: kit.actorUserId });
      await reactivateService(kit.deps, { id, actorUserId: kit.actorUserId });
      await reactivateService(kit.deps, { id, actorUserId: kit.actorUserId });

      expect((await auditOf(id)).map((e) => e.action)).toEqual([
        'service.archived',
        'service.reactivated',
      ]);
    });

    it('[RN-SER-01] reativar com o nome já tomado por outro ativo → SERVICE_NAME_TAKEN e continua arquivado', async () => {
      const id = await create({ name: 'Disputado', priceCents: 1 });
      await archiveService(kit.deps, { id, actorUserId: kit.actorUserId });
      await create({ name: 'disputado', priceCents: 1 });

      expect(codeOf(await reactivateService(kit.deps, { id, actorUserId: kit.actorUserId }))).toBe(
        'SERVICE_NAME_TAKEN',
      );
      expect((await row(id)).archived_at).not.toBeNull();
    });

    it('[RN-SER-03] a taxa de deslocamento pode ser arquivada e reativada; inexistente → NOT_FOUND', async () => {
      const localKit = await createCatalogTestKit();
      try {
        const created = await createService(localKit.deps, {
          name: 'Taxa de deslocamento',
          priceCents: 3000,
          isDisplacementFee: true,
        });
        const id = created.ok ? created.value.id : '';
        const actor = { actorUserId: localKit.actorUserId };

        expect((await archiveService(localKit.deps, { id, ...actor })).ok).toBe(true);
        expect((await reactivateService(localKit.deps, { id, ...actor })).ok).toBe(true);
        expect(
          codeOf(
            await archiveService(localKit.deps, {
              id: '00000000-0000-4000-8000-0000000eeeee',
              ...actor,
            }),
          ),
        ).toBe('NOT_FOUND');
      } finally {
        await localKit.close();
      }
    }, 90_000);
  });

  describe('listServices', () => {
    it('[RF-CAT-07] lista os ativos pelo nome normalizado; includeArchived mostra também os arquivados', async () => {
      const localKit = await createCatalogTestKit();
      try {
        const make = (name: string) => createService(localKit.deps, { name, priceCents: 100 });
        await make('Zeta');
        await make('Ábaco');
        const old = await make('Arquivado');
        await archiveService(localKit.deps, {
          id: old.ok ? old.value.id : '',
          actorUserId: localKit.actorUserId,
        });

        expect((await listServices(localKit.deps)).map((s) => s.name)).toEqual(['Ábaco', 'Zeta']);
        expect(
          (await listServices(localKit.deps, { includeArchived: true })).map((s) => s.name),
        ).toEqual(['Ábaco', 'Arquivado', 'Zeta']);
      } finally {
        await localKit.close();
      }
    }, 90_000);
  });
});
