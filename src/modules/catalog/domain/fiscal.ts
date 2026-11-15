import { DomainError } from '@/shared/errors';
import { err, ok, type Result } from '@/shared/result';

export type FiscalInput = {
  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  csosn?: string | null;
  origin?: number | null;
  unit?: string | null;
};

export type FiscalFields = {
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  csosn: string | null;
  origin: number | null;
  unit: string;
};

const DEFAULT_UNIT = 'UN';

/** Formatos de RN-FIS-02 (CEST com 7 dígitos e origem 0–8: suposição OQ-31). */
const DIGIT_FIELDS = [
  ['ncm', /^\d{8}$/],
  ['cest', /^\d{7}$/],
  ['cfop', /^\d{4}$/],
  ['csosn', /^\d{3}$/],
] as const;

/** Vazio, só espaços ou ausente = "não informado". */
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/**
 * Campos fiscais opcionais (RN-FIS-02): quando preenchidos, o formato é validado; vazios ficam
 * nulos e a emissão fica bloqueada até preencher (Fase 2). A unidade vira maiúscula (padrão
 * `UN`). O erro nomeia o campo em `details.field`, nunca o valor digitado.
 */
export function validateFiscalFields(input: FiscalInput): Result<FiscalFields> {
  const invalid = (field: string) => err(new DomainError('INVALID_FISCAL_FIELD', { field }));

  const digits: Record<'ncm' | 'cest' | 'cfop' | 'csosn', string | null> = {
    ncm: null,
    cest: null,
    cfop: null,
    csosn: null,
  };
  for (const [field, format] of DIGIT_FIELDS) {
    const value = clean(input[field]);
    if (value !== null && !format.test(value)) return invalid(field);
    digits[field] = value;
  }

  const origin = input.origin ?? null;
  if (origin !== null && !(Number.isInteger(origin) && origin >= 0 && origin <= 8)) {
    return invalid('origin');
  }

  const unit = clean(input.unit)?.toUpperCase() ?? DEFAULT_UNIT;
  if (!/^[A-Z]{2}$/.test(unit)) return invalid('unit');

  return ok({ ...digits, origin, unit });
}
