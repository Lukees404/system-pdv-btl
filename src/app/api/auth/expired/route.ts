import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAMES } from '@/modules/auth/access';

/**
 * Destino de `requireUser()` quando o cookie existe mas a sessão não vale mais (revogada,
 * expirada ou inventada). Sem apagar o cookie, o proxy (que só vê "tem cookie") mandaria
 * /login → / e a página mandaria / → /login, num laço infinito. Não toca o banco.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const store = await cookies();
  for (const name of SESSION_COOKIE_NAMES) store.delete(name);
  return NextResponse.redirect(new URL('/login', request.url));
}
