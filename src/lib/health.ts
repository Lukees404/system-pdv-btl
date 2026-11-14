import type { Logger } from './logger';

export type HealthResult = {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
};

export type HealthDeps = {
  /** Faz uma consulta barata no banco (ex.: `SELECT 1`). Rejeitar = banco indisponível. */
  ping: () => Promise<unknown>;
  /** Tempo máximo de espera pelo banco. Padrão: 2 s. */
  timeoutMs?: number;
  logger?: Logger;
};

const DEFAULT_TIMEOUT_MS = 2_000;

/**
 * Verifica se o sistema está saudável (RNF-OBS-03). O resultado tem só `status` e `db`:
 * nunca a mensagem do erro, que pode conter host ou senha (RNF-SEG-10). O detalhe
 * vai para o log, onde o logger remove segredos.
 */
export async function checkHealth(deps: HealthDeps): Promise<HealthResult> {
  const { ping, timeoutMs = DEFAULT_TIMEOUT_MS, logger } = deps;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout após ${timeoutMs} ms`)), timeoutMs);
  });

  try {
    await Promise.race([ping(), timeout]);
    return { status: 'ok', db: 'up' };
  } catch (error) {
    logger?.warn('health check: banco indisponível', { error });
    return { status: 'degraded', db: 'down' };
  } finally {
    clearTimeout(timer);
  }
}

/** Resposta HTTP do health check: 200 se ok, 503 se degradado; nunca em cache. */
export async function healthResponse(deps: HealthDeps): Promise<Response> {
  const result = await checkHealth(deps);
  return Response.json(result, {
    status: result.status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
