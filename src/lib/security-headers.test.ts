import { describe, expect, it } from 'vitest';
import { buildCsp, generateNonce, staticSecurityHeaders } from './security-headers';

const directive = (csp: string, name: string): string =>
  csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `)) ?? '';

describe('buildCsp', () => {
  it('[RNF-SEG-01] em produção, script-src usa nonce + strict-dynamic e NÃO permite inline nem eval', () => {
    const script = directive(buildCsp({ nonce: 'abc123', isDev: false }), 'script-src');

    expect(script).toContain("'nonce-abc123'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it('[RNF-SEG-01] em desenvolvimento, só o eval é liberado (o React o usa para depurar)', () => {
    const csp = buildCsp({ nonce: 'abc123', isDev: true });

    expect(directive(csp, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(csp, 'script-src')).not.toContain("'unsafe-inline'");
  });

  it('[RNF-SEG-01] estilos exigem o nonce em produção, sem unsafe-inline', () => {
    const style = directive(buildCsp({ nonce: 'abc123', isDev: false }), 'style-src');

    expect(style).toContain("'nonce-abc123'");
    expect(style).not.toContain("'unsafe-inline'");
  });

  it('[RNF-SEG-01] política restritiva: default-src self, sem frames, sem plugins, base e forms só da origem', () => {
    const csp = buildCsp({ nonce: 'n', isDev: false });

    expect(directive(csp, 'default-src')).toBe("default-src 'self'");
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(csp, 'form-action')).toBe("form-action 'self'");
  });

  it('[RNF-SEG-01] upgrade-insecure-requests só em produção (em dev o localhost é http)', () => {
    expect(buildCsp({ nonce: 'n', isDev: false })).toContain('upgrade-insecure-requests');
    expect(buildCsp({ nonce: 'n', isDev: true })).not.toContain('upgrade-insecure-requests');
  });
});

describe('generateNonce', () => {
  it('[RNF-SEG-01] gera valores diferentes a cada chamada, com pelo menos 128 bits', () => {
    const first = generateNonce();
    const second = generateNonce();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(atob(first).length).toBeGreaterThanOrEqual(16);
  });
});

describe('staticSecurityHeaders', () => {
  it('[RNF-SEG-01] sempre envia nosniff, referrer-policy, permissions-policy e X-Frame-Options', () => {
    const headers = staticSecurityHeaders({ isDev: true });

    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  it('[RNF-SEG-01] HSTS só em produção, por 2 anos incluindo subdomínios', () => {
    expect(staticSecurityHeaders({ isDev: true })['Strict-Transport-Security']).toBeUndefined();
    expect(staticSecurityHeaders({ isDev: false })['Strict-Transport-Security']).toBe(
      'max-age=63072000; includeSubDomains',
    );
  });
});
