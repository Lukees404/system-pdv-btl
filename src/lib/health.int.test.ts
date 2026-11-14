import { describe, expect, it } from 'vitest';
import { loadTestEnv } from '../../tests/helpers/env';
import { createDb } from './db';
import { healthResponse } from './health';

describe('healthResponse com banco real', () => {
  it('[RNF-OBS-03] banco de teste no ar → 200 { status: ok, db: up }', async () => {
    const db = createDb(loadTestEnv().appUrl);

    try {
      const response = await healthResponse({ ping: () => db.$queryRaw`SELECT 1` });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'ok', db: 'up' });
    } finally {
      await db.$disconnect();
    }
  });

  it('[RNF-OBS-03] banco inalcançável → 503 { status: degraded, db: down }', async () => {
    const db = createDb('postgresql://pdv_app:change-me@127.0.0.1:1/pdv'); // porta 1: ninguém escuta

    try {
      const response = await healthResponse({ ping: () => db.$queryRaw`SELECT 1` });

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ status: 'degraded', db: 'down' });
    } finally {
      await db.$disconnect();
    }
  });
});
