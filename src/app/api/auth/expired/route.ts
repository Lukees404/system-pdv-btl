import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { expiredSessionCookie } from '@/modules/auth/access';

/**
 * Destino de `requireUser()` quando o cookie existe mas a sessão não vale mais (revogada,
 * expirada ou inventada). Sem apagar o cookie, o proxy (que só vê "tem cookie") mandaria
 * /login → / e a página mandaria / → /login, num laço infinito. Não toca o banco.
 * O cookie `__Host-` só é apagado se a resposta o vencer com Secure e Path=/ (RNF-SEG-02).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const store = await cookies();
  for (const isProduction of [true, false]) {
    const cleared = expiredSessionCookie(isProduction);
    store.set(cleared.name, cleared.value, cleared.options);
  }
  return NextResponse.redirect(new URL('/login', request.url));
}
