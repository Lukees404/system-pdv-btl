import type { AuditEntry } from '../domain/audit-entry';

/**
 * Porta de gravação da auditoria. A implementação Prisma recebe o cliente da TRANSAÇÃO do
 * chamador, para a auditoria entrar e sair junto com a ação auditada (RN-ACE-02).
 */
export interface AuditLog {
  record(entry: AuditEntry): Promise<void>;
}
