import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('GET /api/health sem configuração', () => {
  it('[RNF-OBS-03] variáveis de banco ausentes → 503 controlado (nunca 500), sem vazar valores', async () => {
    vi.resetModules();
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('DIRECT_URL', '');
    const logged: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
      logged.push(String(line));
    });
    const { GET } = await import('./route');

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'degraded', db: 'down' });
    // O log diz QUAIS variáveis faltam (só os nomes), para quem for corrigir o deploy.
    const joined = logged.join('\n');
    expect(joined).toContain('INVALID_ENV');
    expect(joined).toContain('DATABASE_URL');
  });
});
