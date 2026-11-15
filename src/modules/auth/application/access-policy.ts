/**
 * Política de acesso OTIMISTA do `proxy.ts` (RNF-SEG-04). O proxy só olha se existe um cookie
 * de sessão: não consulta o banco (roda em toda requisição, inclusive pré-carregamentos) e
 * por isso NÃO é a defesa de verdade. A defesa real é `currentUser()` chamada em cada página
 * e em cada Server Action, perto dos dados.
 */
export type AccessDecision =
  { type: 'allow' } | { type: 'redirect'; to: string } | { type: 'unauthorized' };

const LOGIN_PATH = '/login';
const HOME_PATH = '/';
/** Públicas de propósito: o login e o health check do monitor de uptime. */
const PUBLIC_PATHS = new Set([LOGIN_PATH, '/api/health']);

function normalize(pathname: string): string {
  const lower = pathname.toLowerCase();
  return lower.length > 1 && lower.endsWith('/') ? lower.slice(0, -1) : lower;
}

export function decideAccess(pathname: string, hasSessionCookie: boolean): AccessDecision {
  const path = normalize(pathname);

  if (path === LOGIN_PATH) {
    return hasSessionCookie ? { type: 'redirect', to: HOME_PATH } : { type: 'allow' };
  }
  if (PUBLIC_PATHS.has(path) || hasSessionCookie) return { type: 'allow' };

  const isApi = path === '/api' || path.startsWith('/api/');
  return isApi ? { type: 'unauthorized' } : { type: 'redirect', to: LOGIN_PATH };
}
