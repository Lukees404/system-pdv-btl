/**
 * Cookie da sessão (RNF-SEG-02). Em produção usa o prefixo `__Host-`, que o navegador só
 * aceita com `Secure`, `Path=/` e SEM `Domain` (o cookie fica preso a este site). Em
 * desenvolvimento (http://localhost) o `Secure` e o prefixo impediriam o login.
 */
export const SESSION_COOKIE_NAMES = ['__Host-pdv_session', 'pdv_session'] as const;

export type SessionCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  expires?: Date;
  maxAge?: number;
};

export type SessionCookie = { name: string; value: string; options: SessionCookieOptions };

export function sessionCookieName(isProduction: boolean): string {
  return isProduction ? '__Host-pdv_session' : 'pdv_session';
}

export function sessionCookie(input: {
  isProduction: boolean;
  token: string;
  expiresAt: Date;
}): SessionCookie {
  return {
    name: sessionCookieName(input.isProduction),
    value: input.token,
    options: {
      httpOnly: true,
      secure: input.isProduction,
      sameSite: 'lax',
      path: '/',
      expires: input.expiresAt,
    },
  };
}

/** Cookie "vencido" que o navegador descarta (sair, RF-AUT-02). Mesmos atributos de segurança. */
export function expiredSessionCookie(isProduction: boolean): SessionCookie {
  return {
    name: sessionCookieName(isProduction),
    value: '',
    options: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    },
  };
}
