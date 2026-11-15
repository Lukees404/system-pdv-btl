import { describe, expect, it } from 'vitest';
import {
  SESSION_COOKIE_NAMES,
  expiredSessionCookie,
  sessionCookie,
  sessionCookieName,
} from './session-cookie';

const expiresAt = new Date('2026-04-09T15:00:00.000Z');

describe('sessionCookie', () => {
  it('[RNF-SEG-02] em produção: prefixo __Host-, Secure, HttpOnly, SameSite=Lax, Path=/ e expira com a sessão', () => {
    const cookie = sessionCookie({ isProduction: true, token: 'abc', expiresAt });

    expect(cookie).toEqual({
      name: '__Host-pdv_session',
      value: 'abc',
      options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/', expires: expiresAt },
    });
  });

  it('[RNF-SEG-02] em desenvolvimento (http): sem Secure nem prefixo, mas HttpOnly e Lax', () => {
    const cookie = sessionCookie({ isProduction: false, token: 'abc', expiresAt });

    expect(cookie.name).toBe('pdv_session');
    expect(cookie.options).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('[RNF-SEG-02] o prefixo __Host- proíbe o atributo Domain: o cookie não pode ter domain', () => {
    const cookie = sessionCookie({ isProduction: true, token: 'abc', expiresAt });

    expect(cookie.options).not.toHaveProperty('domain');
  });

  it('[RNF-SEG-02] o nome muda conforme o ambiente e a lista cobre os dois', () => {
    expect(sessionCookieName(true)).toBe('__Host-pdv_session');
    expect(sessionCookieName(false)).toBe('pdv_session');
    expect([...SESSION_COOKIE_NAMES].sort()).toEqual(['__Host-pdv_session', 'pdv_session']);
  });
});

describe('expiredSessionCookie', () => {
  it('[RF-AUT-02] apaga o cookie: valor vazio, mesma segurança e já expirado', () => {
    const cookie = expiredSessionCookie(true);

    expect(cookie.name).toBe('__Host-pdv_session');
    expect(cookie.value).toBe('');
    expect(cookie.options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    expect(cookie.options.expires?.getTime()).toBe(0);
  });
});
