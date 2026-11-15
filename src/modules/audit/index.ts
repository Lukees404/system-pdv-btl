// API pública do módulo `audit` (docs/04): outros módulos importam só daqui.
export { recordAudit } from './application/record-audit';
export type { RecordAuditDeps } from './application/record-audit';
export type { AuditLog } from './application/ports';
export { AUDIT_ACTIONS } from './domain/audit-entry';
export type { AuditAction, AuditEntry, AuditEntryInput } from './domain/audit-entry';
export { PrismaAuditLog } from './infrastructure/prisma-audit-log';
export { InMemoryAuditLog } from './infrastructure/in-memory-audit-log';
