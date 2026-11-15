import { describe, expect, it } from 'vitest';
import { FakeClock } from '@/shared/clock';
import { AUDIT_ACTIONS, buildAuditEntry } from './audit-entry';

const clock = new FakeClock(new Date('2026-03-10T15:00:00.000Z'));

describe('buildAuditEntry', () => {
  it('[RN-ACE-02] monta a entrada com o horário do Clock injetado', () => {
    const entry = buildAuditEntry(
      {
        userId: 'user-1',
        action: 'user.created',
        entityType: 'user',
        entityId: 'user-2',
        data: { role: 'OWNER' },
      },
      clock,
    );

    expect(entry).toEqual({
      userId: 'user-1',
      action: 'user.created',
      entityType: 'user',
      entityId: 'user-2',
      data: { role: 'OWNER' },
      createdAt: new Date('2026-03-10T15:00:00.000Z'),
    });
  });

  it('[RN-ACE-02] aceita ação do sistema (userId nulo), sem entityId e sem data', () => {
    const entry = buildAuditEntry(
      { userId: null, action: 'user.created', entityType: 'user' },
      clock,
    );

    expect(entry.userId).toBeNull();
    expect(entry.entityId).toBeNull();
    expect(entry.data).toEqual({});
  });

  it('[RN-ACE-02] o catálogo de ações já inclui criação de usuário e troca de senha', () => {
    expect(AUDIT_ACTIONS).toContain('user.created');
    expect(AUDIT_ACTIONS).toContain('user.password_changed');
  });

  it('[RN-ACE-02] o catálogo inclui preço/custo alterado e arquivar/reativar de produto e serviço', () => {
    expect(AUDIT_ACTIONS).toEqual(
      expect.arrayContaining([
        'product.price_changed',
        'product.archived',
        'product.reactivated',
        'service.price_changed',
        'service.archived',
        'service.reactivated',
      ]),
    );
  });

  it('[RN-ACE-02] toda ação segue o padrão entidade.verbo e não se repete (nomes são estáveis no banco)', () => {
    for (const action of AUDIT_ACTIONS) expect(action).toMatch(/^[a-z]+\.[a-z_]+$/);
    expect(new Set(AUDIT_ACTIONS).size).toBe(AUDIT_ACTIONS.length);
  });

  it('[RN-ACE-03][RN-CAT-05] preço/custo anterior e novo (centavos) e ids são aceitos, sem dado pessoal', () => {
    const entry = buildAuditEntry(
      {
        userId: 'u1',
        action: 'product.price_changed',
        entityType: 'product',
        entityId: 'p1',
        data: {
          before: { priceCents: 1000, costCents: null },
          after: { priceCents: 1250, costCents: 700 },
        },
      },
      clock,
    );

    expect(entry.data).toEqual({
      before: { priceCents: 1000, costCents: null },
      after: { priceCents: 1250, costCents: 700 },
    });
  });

  it('[RN-ACE-03] a auditoria do catálogo rejeita dado pessoal embutido no payload', () => {
    expect(() =>
      buildAuditEntry(
        {
          userId: 'u1',
          action: 'service.archived',
          entityType: 'service',
          entityId: 's1',
          data: { serviceId: 's1', customer: { phone: '9299999' } },
        },
        clock,
      ),
    ).toThrow(expect.objectContaining({ code: 'AUDIT_PII_FORBIDDEN' }));
  });

  it('[RN-ACE-03] aceita IDs e diferenças de valores não pessoais', () => {
    expect(() =>
      buildAuditEntry(
        {
          userId: 'u1',
          action: 'user.password_changed',
          entityType: 'user',
          entityId: 'u1',
          data: { before: { priceCents: 1000 }, after: { priceCents: 1200 }, productId: 'p1' },
        },
        clock,
      ),
    ).not.toThrow();
  });

  it.each(['name', 'email', 'cpf', 'phone', 'address', 'password', 'token'])(
    '[RN-ACE-03][RNF-LGPD-05] rejeita o campo pessoal "%s" no nível raiz',
    (key) => {
      expect(() =>
        buildAuditEntry(
          { userId: 'u1', action: 'user.created', entityType: 'user', data: { [key]: 'x' } },
          clock,
        ),
      ).toThrow(
        expect.objectContaining({ code: 'AUDIT_PII_FORBIDDEN', details: { paths: [key] } }),
      );
    },
  );

  it('[RN-ACE-03][RNF-LGPD-05] encontra campo pessoal em qualquer profundidade, inclusive em listas', () => {
    expect.assertions(2);
    try {
      buildAuditEntry(
        {
          userId: 'u1',
          action: 'user.created',
          entityType: 'user',
          data: {
            ok: 1,
            customer: { id: 'c1', phone: '9299999' },
            items: [{ sku: 'A' }, { buyerEmail: 'a@b.com' }],
          },
        },
        clock,
      );
    } catch (error) {
      expect(error).toMatchObject({ code: 'AUDIT_PII_FORBIDDEN' });
      expect((error as { details: { paths: string[] } }).details.paths.sort()).toEqual([
        'customer.phone',
        'items.1.buyerEmail',
      ]);
    }
  });

  it('[RN-ACE-03] o erro lista só os CAMINHOS dos campos, nunca os valores', () => {
    expect.assertions(1);
    try {
      buildAuditEntry(
        {
          userId: 'u1',
          action: 'user.created',
          entityType: 'user',
          data: { email: 'maria@exemplo.com' },
        },
        clock,
      );
    } catch (error) {
      expect(JSON.stringify((error as { details: unknown }).details)).not.toContain('maria');
    }
  });

  it('[RN-ACE-03] referência circular não derruba a validação', () => {
    const loop: Record<string, unknown> = { id: 1 };
    loop.self = loop;

    expect(() =>
      buildAuditEntry(
        { userId: 'u1', action: 'user.created', entityType: 'user', data: loop },
        clock,
      ),
    ).not.toThrow(/Maximum call stack/);
  });
});
