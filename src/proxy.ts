import { NextResponse, type NextRequest } from 'next/server';
import { isDevelopment } from '@/lib/env';
import { buildCsp, generateNonce, staticSecurityHeaders } from '@/lib/security-headers';
import { SESSION_COOKIE_NAMES, decideAccess } from '@/modules/auth/access';

function withSecurityHeaders(response: NextResponse, csp: string, isDev: boolean): NextResponse {
  response.headers.set('Content-Security-Policy', csp);
  for (const [name, value] of Object.entries(staticSecurityHeaders({ isDev }))) {
    response.headers.set(name, value);
  }
  return response;
}

/**
 * Checagem OTIMISTA (RNF-SEG-04): só vê se há cookie de sessão; não consulta o banco (roda em
 * toda requisição, inclusive pré-carregamentos). Um cookie inventado passa por aqui, mas é
 * barrado em `currentUser()` (páginas e Server Actions), que é a defesa de verdade.
 * Também aplica a CSP com nonce e os cabeçalhos fixos em TODA resposta (RNF-SEG-01).
 */
export function proxy(request: NextRequest): NextResponse {
  const isDev = isDevelopment();
  const nonce = generateNonce();
  const csp = buildCsp({ nonce, isDev });
  const decorate = (response: NextResponse) => withSecurityHeaders(response, csp, isDev);

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
  const decision = decideAccess(request.nextUrl.pathname, hasSessionCookie);

  if (decision.type === 'redirect') {
    return decorate(NextResponse.redirect(new URL(decision.to, request.url)));
  }
  if (decision.type === 'unauthorized') {
    return decorate(NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 }));
  }

  // O Next lê a CSP da REQUISIÇÃO para pôr o nonce nos seus próprios scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  return decorate(NextResponse.next({ request: { headers: requestHeaders } }));
}

// Fora arquivos estáticos e imagens otimizadas; o resto (inclusive /api) passa pela política.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
