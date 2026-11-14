import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '@/shared/clock';
import { checkHealth, healthResponse } from './health';
import { createLogger } from './logger';

function captureLogger() {
  const lines: string[] = [];
  const logger = createLogger({
    clock: new FakeClock(new Date('2026-03-10T15:00:00.000Z')),
    level: 'debug',
    write: (line) => lines.push(line),
  });
  return { logger, lines };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('checkHealth', () => {
  it('[RNF-OBS-03] banco respondendo → ok / up', async () => {
    const result = await checkHealth({ ping: () => Promise.resolve([{ '?column?': 1 }]) });

    expect(result).toEqual({ status: 'ok', db: 'up' });
  });

  it('[RNF-OBS-03] banco falhando → degraded / down', async () => {
    const result = await checkHealth({ ping: () => Promise.reject(new Error('boom')) });

    expect(result).toEqual({ status: 'degraded', db: 'down' });
  });

  it('[RNF-SEG-10] o resultado nunca carrega a mensagem do erro nem a URL do banco', async () => {
    const secret = 'postgresql://pdv_app:supersecret@db.exemplo.com:5432/pdv';

    const result = await checkHealth({
      ping: () => Promise.reject(new Error(`falha em ${secret}`)),
    });

    expect(JSON.stringify(result)).not.toContain('supersecret');
    expect(Object.keys(result).sort()).toEqual(['db', 'status']);
  });

  it('[RNF-OBS-03] ping que nunca responde estoura o tempo limite (padrão 2 s) → down', async () => {
    vi.useFakeTimers();
    const pending = checkHealth({ ping: () => new Promise(() => {}) });

    await vi.advanceTimersByTimeAsync(1_999);
    let settled = false;
    void pending.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ status: 'degraded', db: 'down' });
  });

  it('[RNF-OBS-03] o tempo limite é configurável', async () => {
    vi.useFakeTimers();
    const pending = checkHealth({ ping: () => new Promise(() => {}), timeoutMs: 50 });

    await vi.advanceTimersByTimeAsync(50);

    expect(await pending).toEqual({ status: 'degraded', db: 'down' });
  });

  it('[RNF-OBS-03] não deixa timer pendente quando o banco responde', async () => {
    vi.useFakeTimers();

    await checkHealth({ ping: () => Promise.resolve(1) });

    expect(vi.getTimerCount()).toBe(0);
  });

  it('[RNF-OBS-01] registra um warn quando o banco falha, sem segredos', async () => {
    const { logger, lines } = captureLogger();
    const secret = 'postgresql://pdv_app:supersecret@db.exemplo.com:5432/pdv';

    await checkHealth({ ping: () => Promise.reject(new Error(`falha em ${secret}`)), logger });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({
      level: 'warn',
      msg: 'health check: banco indisponível',
    });
    expect(lines.join('\n')).not.toContain('supersecret');
  });

  it('[RNF-OBS-01] não registra nada quando está tudo ok', async () => {
    const { logger, lines } = captureLogger();

    await checkHealth({ ping: () => Promise.resolve(1), logger });

    expect(lines).toHaveLength(0);
  });
});

describe('healthResponse', () => {
  it('[RNF-OBS-03] ok → HTTP 200, JSON e Cache-Control: no-store', async () => {
    const response = await healthResponse({ ping: () => Promise.resolve(1) });

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(await response.json()).toEqual({ status: 'ok', db: 'up' });
  });

  it('[RNF-OBS-03] degradado → HTTP 503 com o mesmo formato', async () => {
    const response = await healthResponse({ ping: () => Promise.reject(new Error('x')) });

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ status: 'degraded', db: 'down' });
  });
});
