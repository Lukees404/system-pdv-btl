import type { Clock } from '@/shared/clock';
import { DomainError } from '@/shared/errors';
import { isSensitiveKey } from '@/shared/pii';

/**
 * Ações auditáveis (RN-ACE-02), no padrão `entidade.verbo`. O catálogo cresce a cada marco:
 * M1 (usuários) e M2 (preço/custo alterado, arquivar e reativar produtos e serviços);
 * venda, estoque, caixa etc. entram junto com os seus módulos. Os nomes são gravados no banco:
 * nunca renomear uma ação já registrada.
 */
export const AUDIT_ACTIONS = [
  'user.created',
  'user.password_changed',
  'product.price_changed',
  'product.archived',
  'product.reactivated',
  'service.price_changed',
  'service.archived',
  'service.reactivated',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditEntryInput = {
  /** Quem fez; `null` para ações do sistema/script. */
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  /** Só IDs e diferenças de valores NÃO pessoais (RN-ACE-03). */
  data?: Record<string, unknown>;
};

export type AuditEntry = {
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  data: Record<string, unknown>;
  createdAt: Date;
};

/** Caminhos (ex.: `customer.phone`, `items.1.buyerEmail`) de campos com nome pessoal/sensível. */
function findSensitivePaths(value: unknown, prefix: string[], ancestors: object[]): string[] {
  if (value === null || typeof value !== 'object' || ancestors.includes(value)) return [];
  const path = [...ancestors, value];

  return Object.entries(value).flatMap(([key, child]) => {
    const here = [...prefix, key];
    const own = isSensitiveKey(key) ? [here.join('.')] : [];
    return [...own, ...findSensitivePaths(child, here, path)];
  });
}

/**
 * Monta uma entrada de auditoria válida. Se `data` tiver um campo com nome de dado pessoal
 * ou segredo, lança `AUDIT_PII_FORBIDDEN` listando só os CAMINHOS (nunca os valores):
 * o `audit_log` não pode conter dado pessoal (RN-ACE-03, RNF-LGPD-05). É erro de quem chama
 * (bug), por isso exceção e não `Result`.
 */
export function buildAuditEntry(input: AuditEntryInput, clock: Clock): AuditEntry {
  const data = input.data ?? {};
  const paths = findSensitivePaths(data, [], []);
  if (paths.length > 0) {
    throw new DomainError('AUDIT_PII_FORBIDDEN', { paths });
  }

  return {
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    data,
    createdAt: clock.now(),
  };
}
