import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';
import { parseCatalogName } from './catalog-name';
import { isNonNegativeCents } from './cents';

const MAX_SERVICE_NAME_LENGTH = 120;

export type ServiceInput = {
  name: string;
  priceCents: number;
  isDisplacementFee?: boolean;
  fiscalServiceCode?: string | null;
};

/** Sem custo nem estoque: serviços não movimentam estoque e não têm custo (RN-SER-05/07). */
export type ServiceData = {
  name: string;
  nameNormalized: string;
  priceCents: number;
  isDisplacementFee: boolean;
  fiscalServiceCode: string | null;
};

/**
 * Serviço (RN-SER-01/03): nome de 1 a 120 caracteres e preço padrão ≥ 0 em centavos. O código
 * fiscal (`fiscal_service_code`, RN-FIS-02) é opcional; o formato depende do provedor da
 * Fase 2 e por enquanto só perde os espaços das pontas. Que existe no máximo UMA taxa de
 * deslocamento é garantido pelo banco (índice único parcial).
 */
export function validateService(input: ServiceInput): Result<ServiceData> {
  const name = parseCatalogName(input.name, MAX_SERVICE_NAME_LENGTH);
  if (!name) return err(new DomainError('INVALID_CATALOG_NAME', { field: 'name' }));

  if (!isNonNegativeCents(input.priceCents)) {
    return err(new DomainError('INVALID_MONEY', { field: 'priceCents' }));
  }

  const code = input.fiscalServiceCode?.trim() ?? '';
  return ok({
    ...name,
    priceCents: input.priceCents,
    isDisplacementFee: input.isDisplacementFee ?? false,
    fiscalServiceCode: code === '' ? null : code,
  });
}
