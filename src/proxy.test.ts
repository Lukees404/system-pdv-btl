import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${path}`, cookie ? { headers: { cookie } } : undefined);

describe('proxy (checagem otimista)', () => {
  it('[RNF-SEG-04] página protegida sem cookie → redireciona para /login', () => {
    const response = proxy(request('/conta'));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/login');
  });

  it('[RNF-SEG-04] com cookie de sessão a página passa', () => {
    const response = proxy(request('/conta', 'pdv_session=qualquer'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('[RNF-SEG-02] reconhece também o cookie de produção com prefixo __Host-', () => {
    const response = proxy(request('/', '__Host-pdv_session=qualquer'));

    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('[RNF-SEG-04] rota /api sem cookie → 401 em JSON (não redireciona)', async () => {
    const response = proxy(request('/api/vendas'));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHENTICATED' });
  });

  it('[RNF-OBS-03] /api/health continua pública sem cookie', () => {
    const response = proxy(request('/api/health'));

    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('[RNF-SEG-01] toda resposta (passa, redireciona, 401) leva a CSP e os cabeçalhos fixos', () => {
    const responses = [
      proxy(request('/conta', 'pdv_session=x')),
      proxy(request('/conta')),
      proxy(request('/api/vendas')),
    ];

    for (const response of responses) {
      expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    }
  });

  it('[RNF-SEG-01] o nonce muda a cada requisição e é repassado à renderização', () => {
    const first = proxy(request('/conta', 'pdv_session=x'));
    const second = proxy(request('/conta', 'pdv_session=x'));
    const nonceOf = (response: Response) =>
      /'nonce-([^']+)'/.exec(response.headers.get('content-security-policy') ?? '')?.[1];

    expect(nonceOf(first)).toBeTruthy();
    expect(nonceOf(first)).not.toBe(nonceOf(second));
    expect(first.headers.get('x-middleware-request-x-nonce')).toBe(nonceOf(first));
    expect(first.headers.get('x-middleware-request-content-security-policy')).toBe(
      first.headers.get('content-security-policy'),
    );
  });

  it('[RF-AUT-01] /login com sessão leva ao início; sem sessão abre normalmente', () => {
    const withSession = proxy(request('/login', 'pdv_session=x'));
    const without = proxy(request('/login'));

    expect(withSession.status).toBe(307);
    expect(new URL(withSession.headers.get('location') ?? '').pathname).toBe('/');
    expect(without.headers.get('x-middleware-next')).toBe('1');
  });
});
