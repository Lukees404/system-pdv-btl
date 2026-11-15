import type { Clock } from '@/shared/clock';
import { buildAuditEntry, type AuditEntryInput } from '../domain/audit-entry';
import type { AuditLog } from './ports';

export type RecordAuditDeps = { log: AuditLog; clock: Clock };

/** Valida (sem dado pessoal), carimba com o `Clock` e grava. Nada é gravado se a validação falha. */
export async function recordAudit(deps: RecordAuditDeps, input: AuditEntryInput): Promise<void> {
  await deps.log.record(buildAuditEntry(input, deps.clock));
}
