import type { AuditLog } from '../application/ports';
import type { AuditEntry } from '../domain/audit-entry';

/** Auditoria em memória, para testes de outros módulos que não precisam do banco. */
export class InMemoryAuditLog implements AuditLog {
  readonly entries: AuditEntry[] = [];

  record(entry: AuditEntry): Promise<void> {
    // Guarda uma cópia: mudar o objeto original depois não altera o registro.
    this.entries.push({
      ...entry,
      data: structuredClone(entry.data),
      createdAt: new Date(entry.createdAt),
    });
    return Promise.resolve();
  }
}
