import { recordAudit } from '@/modules/audit';
import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { validateProduct, type ProductInput } from '../domain/product';
import { guardConflicts, type CatalogDeps } from './deps';

export type UpdateProductInput = ProductInput & { id: string; actorUserId: string | null };

/**
 * Edita um produto (RF-CAT-02). O preço/custo novo vale só para vendas futuras (RN-CAT-05); se
 * o preço OU o custo mudou, grava `product.price_changed` com antes/depois em centavos NA MESMA
 * transação (RN-ACE-02): se a auditoria falha, a alteração é desfeita. Não mexe no estoque.
 */
export async function updateProduct(
  deps: CatalogDeps,
  { id, actorUserId, ...fields }: UpdateProductInput,
): Promise<Result<void>> {
  const product = validateProduct(fields);
  if (!product.ok) return product;

  const now = deps.clock.now();
  return guardConflicts(() =>
    deps.uow.run(async ({ products, audit }) => {
      const current = await products.findById(id);
      if (!current) return err(new DomainError('NOT_FOUND'));

      await products.update(id, product.value, now);

      const { priceCents, costCents } = product.value;
      if (priceCents !== current.priceCents || costCents !== current.costCents) {
        await recordAudit(
          { log: audit, clock: deps.clock },
          {
            userId: actorUserId,
            action: 'product.price_changed',
            entityType: 'product',
            entityId: id,
            data: {
              before: { priceCents: current.priceCents, costCents: current.costCents },
              after: { priceCents, costCents },
            },
          },
        );
      }
      return ok(undefined);
    }),
  );
}
