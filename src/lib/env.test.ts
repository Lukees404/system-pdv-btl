import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENV_KEYS, parseEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://app:secret@localhost:5432/pdv',
  DIRECT_URL: 'postgresql://owner:secret@localhost:5432/pdv',
};

describe('parseEnv', () => {
  it('[RNF-OPS-03] aceita env válida e aplica os valores padrão', () => {
    const env = parseEnv(valid);

    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.DIRECT_URL).toBe(valid.DIRECT_URL);
    expect(env.NODE_ENV).toBe('development');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('[RNF-OPS-03] variáveis de teste são opcionais', () => {
    const env = parseEnv({
      ...valid,
      TEST_DATABASE_URL: 'postgresql://app:secret@localhost:54329/pdv_test',
      TEST_DIRECT_URL: 'postgresql://owner:secret@localhost:54329/pdv_test',
    });

    expect(env.TEST_DATABASE_URL).toContain('pdv_test');
  });

  it('[RNF-OPS-03] variável obrigatória ausente → INVALID_ENV listando só os NOMES', () => {
    expect.assertions(2);
    try {
      parseEnv({});
    } catch (error) {
      expect(error).toMatchObject({ code: 'INVALID_ENV' });
      expect((error as { details: { variables: string[] } }).details.variables).toEqual([
        'DATABASE_URL',
      ]);
    }
  });

  it('[RNF-SEG-07] DIRECT_URL é opcional no runtime: só o CLI de migração a usa', () => {
    // Em produção a aplicação roda só com o usuário de privilégio mínimo (DATABASE_URL);
    // a credencial do dono do schema não precisa estar no ambiente do servidor.
    const env = parseEnv({ DATABASE_URL: valid.DATABASE_URL });

    expect(env.DIRECT_URL).toBeUndefined();
  });

  it('[RNF-SEG-06] o erro nunca contém o VALOR de uma variável inválida', () => {
    expect.assertions(1);
    try {
      parseEnv({ ...valid, DATABASE_URL: 'mysql://user:supersecret@host/db' });
    } catch (error) {
      const e = error as Error & { details: unknown };
      expect(JSON.stringify({ message: e.message, details: e.details })).not.toContain(
        'supersecret',
      );
    }
  });

  it('[RNF-OPS-03] string vazia conta como ausente', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: '' })).toThrow(
      expect.objectContaining({ code: 'INVALID_ENV' }),
    );
  });

  it('[RNF-OPS-03] rejeita URL que não seja de PostgreSQL', () => {
    expect(() => parseEnv({ ...valid, DIRECT_URL: 'http://localhost/db' })).toThrow(
      expect.objectContaining({ code: 'INVALID_ENV' }),
    );
  });

  it('[RNF-OPS-03] rejeita NODE_ENV e LOG_LEVEL desconhecidos', () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(
      expect.objectContaining({ code: 'INVALID_ENV' }),
    );
    expect(() => parseEnv({ ...valid, LOG_LEVEL: 'verbose' })).toThrow(
      expect.objectContaining({ code: 'INVALID_ENV' }),
    );
  });
});

describe('.env.example', () => {
  const lines = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'));
  const entries = Object.fromEntries(
    lines.map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
  );

  it('[RNF-OPS-03] documenta todas as variáveis do schema, e só elas', () => {
    expect(Object.keys(entries).sort()).toEqual([...ENV_KEYS].sort());
  });

  it('[RNF-OPS-03] os valores de exemplo passam na própria validação', () => {
    expect(() => parseEnv(entries)).not.toThrow();
  });

  it('[RNF-SEG-06] contém apenas placeholders: hosts locais e senha "change-me"', () => {
    for (const [key, value] of Object.entries(entries)) {
      if (!value.includes('://')) continue;
      const url = new URL(value);
      expect(['localhost', '127.0.0.1'], `host de ${key}`).toContain(url.hostname);
      expect(url.password, `senha de ${key}`).toBe('change-me');
    }
  });
});
