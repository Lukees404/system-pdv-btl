import { describe, expect, it } from 'vitest';
import { DomainError } from '@/shared/errors';
import { FakeClock } from '@/shared/clock';
import { createLogger, type LogLevel } from './logger';

function setup(level: LogLevel = 'debug') {
  const clock = new FakeClock(new Date('2026-03-10T15:00:00.000Z'));
  const lines: string[] = [];
  const logger = createLogger({ clock, level, write: (line) => lines.push(line) });
  const parsed = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  return { clock, lines, logger, parsed };
}

describe('estrutura da linha', () => {
  it('[RNF-OBS-01] cada linha é um JSON com level, time (do Clock), msg, requestId e userId', () => {
    const { logger, parsed } = setup();

    logger.child({ requestId: 'req-1', userId: 'user-9' }).info('venda concluída');

    expect(parsed()).toEqual([
      {
        time: '2026-03-10T15:00:00.000Z',
        level: 'info',
        msg: 'venda concluída',
        requestId: 'req-1',
        userId: 'user-9',
      },
    ]);
  });

  it('[RNF-OBS-01] aceita ação e duração como campos comuns', () => {
    const { logger, parsed } = setup();

    logger.info('finalizou', { action: 'complete-sale', durationMs: 123 });

    expect(parsed()[0]).toMatchObject({ action: 'complete-sale', durationMs: 123 });
  });

  it('[RNF-OBS-01] o horário vem do Clock injetado, não do relógio do sistema', () => {
    const { clock, logger, parsed } = setup();

    logger.info('a');
    clock.advance(5_000);
    logger.info('b');

    expect(parsed().map((line) => line.time)).toEqual([
      '2026-03-10T15:00:00.000Z',
      '2026-03-10T15:00:05.000Z',
    ]);
  });

  it('[RNF-OBS-01] um campo do chamador não consegue sobrescrever level, time ou msg', () => {
    const { logger, parsed } = setup();

    logger.warn('real', { level: 'debug', time: 'x', msg: 'falso' });

    expect(parsed()[0]).toMatchObject({
      level: 'warn',
      msg: 'real',
      time: '2026-03-10T15:00:00.000Z',
    });
  });
});

describe('nível mínimo', () => {
  it('[RNF-OBS-01] descarta o que estiver abaixo do nível configurado', () => {
    const { logger, parsed } = setup('warn');

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(parsed().map((line) => line.level)).toEqual(['warn', 'error']);
  });
});

describe('redação de dados pessoais', () => {
  it.each(['name', 'cpf', 'phone', 'address', 'email', 'password', 'token', 'authorization'])(
    '[RNF-LGPD-05] mascara o campo "%s"',
    (key) => {
      const { logger, parsed } = setup();

      logger.info('x', { [key]: 'valor-sensivel' });

      expect(parsed()[0]).toMatchObject({ [key]: '[REDACTED]' });
    },
  );

  it('[RNF-LGPD-05] ignora maiúsculas, separadores e prefixos (customerPhone, new_password)', () => {
    const { logger, parsed } = setup();

    logger.info('x', {
      CPF: '1',
      customerPhone: '2',
      new_password: '3',
      Authorization: '4',
      'api-token': '5',
    });

    expect(parsed()[0]).toMatchObject({
      CPF: '[REDACTED]',
      customerPhone: '[REDACTED]',
      new_password: '[REDACTED]',
      Authorization: '[REDACTED]',
      'api-token': '[REDACTED]',
    });
  });

  it('[RNF-LGPD-05] mascara em qualquer profundidade, inclusive dentro de listas', () => {
    const { logger, parsed } = setup();

    logger.info('x', {
      sale: { id: 's1', customer: { name: 'Maria', phone: '9299999' } },
      items: [{ sku: 'A1', email: 'a@b.com' }],
    });

    expect(parsed()[0]).toMatchObject({
      sale: { id: 's1', customer: { name: '[REDACTED]', phone: '[REDACTED]' } },
      items: [{ sku: 'A1', email: '[REDACTED]' }],
    });
  });

  it('[RNF-LGPD-05] não mascara campos sem relação com dados pessoais', () => {
    const { logger, parsed } = setup();

    logger.info('x', { saleId: 's1', quantity: 3, productName: 'Ração 1kg', filename: 'a.csv' });

    expect(parsed()[0]).toMatchObject({
      saleId: 's1',
      quantity: 3,
      productName: 'Ração 1kg',
      filename: 'a.csv',
    });
  });

  it('[RNF-LGPD-05] também mascara o contexto do child()', () => {
    const { logger, parsed } = setup();

    logger.child({ requestId: 'r1', email: 'a@b.com' }).info('x');

    expect(parsed()[0]).toMatchObject({ requestId: 'r1', email: '[REDACTED]' });
  });
});

describe('erros e segredos', () => {
  it('[ADR-012] DomainError é registrado com code e details, sem stack', () => {
    const { logger, parsed } = setup();

    logger.error('falhou', { error: new DomainError('INVALID_MONEY', { value: 1.5 }) });

    expect(parsed()[0]).toMatchObject({
      error: { name: 'DomainError', code: 'INVALID_MONEY', details: { value: 1.5 } },
    });
    expect(parsed()[0]?.error).not.toHaveProperty('stack');
  });

  it('[RNF-OBS-01] Error inesperado leva name, message e stack para diagnóstico', () => {
    const { logger, parsed } = setup();

    logger.error('falhou', { error: new Error('boom') });

    expect(parsed()[0]?.error).toMatchObject({ name: 'Error', message: 'boom' });
    expect(typeof (parsed()[0]?.error as { stack: unknown }).stack).toBe('string');
  });

  it('[RNF-OBS-01] Error inesperado leva o code (ex.: ECONNREFUSED) para diagnóstico', () => {
    const { logger, parsed } = setup();
    const error = Object.assign(new Error('connect falhou'), { code: 'ECONNREFUSED' });

    logger.error('falhou', { error });

    expect(parsed()[0]?.error).toMatchObject({ code: 'ECONNREFUSED' });
  });

  it('[RNF-OBS-01] Error inesperado leva a causa (cause), também sem segredos', () => {
    const { logger, lines, parsed } = setup();
    const url = 'postgresql://pdv_app:supersecret@db.exemplo.com:5432/pdv';
    const error = new Error('wrapper', { cause: new Error(`causa real em ${url}`) });

    logger.error('falhou', { error });

    expect(parsed()[0]?.error).toMatchObject({ cause: { name: 'Error' } });
    expect(JSON.stringify(parsed()[0]?.error)).toContain('causa real');
    expect(lines.join('\n')).not.toContain('supersecret');
  });

  it('[RNF-SEG-10] ciclo entre causas de erro não derruba o logger', () => {
    const { logger, parsed } = setup();
    const a = new Error('a');
    const b = new Error('b', { cause: a });
    a.cause = b;

    expect(() => logger.error('x', { error: a })).not.toThrow();
    expect(parsed()[0]?.error).toMatchObject({ name: 'Error', cause: { cause: '[Circular]' } });
  });

  it('[RNF-SEG-06] a senha de uma URL de banco nunca chega ao log (msg, campos e erros)', () => {
    const { logger, lines } = setup();
    const url = 'postgresql://pdv_app:supersecret@db.exemplo.com:5432/pdv';

    logger.error(`falha ao conectar em ${url}`, {
      target: url,
      error: new Error(`connect failed for ${url}`),
    });

    expect(lines.join('\n')).not.toContain('supersecret');
  });

  it('[RNF-SEG-10] referência circular não derruba o logger', () => {
    const { logger, parsed } = setup();
    const loop: Record<string, unknown> = { id: 1 };
    loop.self = loop;

    expect(() => logger.info('x', { loop })).not.toThrow();
    expect(parsed()[0]).toMatchObject({ loop: { id: 1, self: '[Circular]' } });
  });
});
