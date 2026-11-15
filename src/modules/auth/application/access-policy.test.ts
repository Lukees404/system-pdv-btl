import { describe, expect, it } from 'vitest';
import { decideAccess } from './access-policy';

describe('decideAccess', () => {
  it('[RNF-SEG-04] sem sessão, páginas protegidas redirecionam para /login', () => {
    for (const path of ['/', '/conta', '/qualquer-coisa', '/produtos/123']) {
      expect(decideAccess(path, false)).toEqual({ type: 'redirect', to: '/login' });
    }
  });

  it('[RNF-SEG-04] com cookie de sessão, as páginas passam (a checagem de verdade é no servidor)', () => {
    for (const path of ['/', '/conta', '/produtos']) {
      expect(decideAccess(path, true)).toEqual({ type: 'allow' });
    }
  });

  it('[RF-AUT-01] /login é pública sem sessão e, com sessão, leva ao início', () => {
    expect(decideAccess('/login', false)).toEqual({ type: 'allow' });
    expect(decideAccess('/login', true)).toEqual({ type: 'redirect', to: '/' });
  });

  it('[RNF-SEG-04] rotas /api sem sessão respondem 401 (nunca redirecionam), com sessão passam', () => {
    expect(decideAccess('/api/vendas', false)).toEqual({ type: 'unauthorized' });
    expect(decideAccess('/api/vendas', true)).toEqual({ type: 'allow' });
  });

  it('[RNF-SEG-04] /api/auth/expired é pública: quem já perdeu o cookie ainda precisa chegar ao login', () => {
    expect(decideAccess('/api/auth/expired', false)).toEqual({ type: 'allow' });
    expect(decideAccess('/api/auth/expired', true)).toEqual({ type: 'allow' });
  });

  it('[RNF-OBS-03] /api/health é pública de propósito (monitor de uptime), com ou sem sessão', () => {
    expect(decideAccess('/api/health', false)).toEqual({ type: 'allow' });
    expect(decideAccess('/api/health', true)).toEqual({ type: 'allow' });
  });

  it('[RNF-SEG-04] barra final e maiúsculas não escapam da regra', () => {
    expect(decideAccess('/login/', true)).toEqual({ type: 'redirect', to: '/' });
    expect(decideAccess('/conta/', false)).toEqual({ type: 'redirect', to: '/login' });
    expect(decideAccess('/API/health', false)).toEqual({ type: 'allow' });
    expect(decideAccess('/Api/Vendas', false)).toEqual({ type: 'unauthorized' });
  });

  it('[RNF-SEG-04] um prefixo parecido com uma rota pública não vira pública (/login-admin, /api/healthz)', () => {
    expect(decideAccess('/login-admin', false)).toEqual({ type: 'redirect', to: '/login' });
    expect(decideAccess('/api/healthz', false)).toEqual({ type: 'unauthorized' });
  });
});
