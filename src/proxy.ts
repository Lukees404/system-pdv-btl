import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAMES, decideAccess } from '@/modules/auth/access';

/**
 * Checagem OTIMISTA (RNF-SEG-04): só vê se há cookie de sessão; não consulta o banco (roda em
 * toda requisição, inclusive pré-carregamentos). Um cookie inventado passa por aqui, mas é
 * barrado em `currentUser()` (páginas e Server Actions), que é a defesa de verdade.
 */
export function proxy(request: NextRequest): NextResponse {
  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
  const decision = decideAccess(request.nextUrl.pathname, hasSessionCookie);

  if (decision.type === 'redirect') {
    return NextResponse.redirect(new URL(decision.to, request.url));
  }
  if (decision.type === 'unauthorized') {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  return NextResponse.next();
}

// Fora arquivos estáticos e imagens otimizadas; o resto (inclusive /api) passa pela política.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
