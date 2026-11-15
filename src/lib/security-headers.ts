/**
 * Cabeçalhos de segurança (RNF-SEG-01). Funções puras: o `proxy.ts` as aplica em toda resposta.
 * A CSP usa um nonce novo por requisição + `strict-dynamic`: só scripts que o servidor marcou
 * (e o que eles carregarem) executam, então um HTML injetado por XSS não roda.
 */

/** 16 bytes aleatórios (128 bits) em base64; Web Crypto existe no runtime do proxy. */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function buildCsp({ nonce, isDev }: { nonce: string; isDev: boolean }): string {
  const directives = [
    "default-src 'self'",
    // `unsafe-eval` só em dev: o React o usa para reconstruir pilhas de chamadas ao depurar.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Em dev, o HMR injeta estilos sem nonce; em produção só estilos com nonce.
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

export function staticSecurityHeaders({ isDev }: { isDev: boolean }): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'X-Frame-Options': 'DENY',
  };
  // HSTS só em produção: em http://localhost o navegador o ignoraria e, em um domínio de
  // teste, grudaria https por dois anos.
  if (!isDev) headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains';
  return headers;
}
