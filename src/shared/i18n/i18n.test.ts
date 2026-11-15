import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '../errors';
import { errorMessage, t, tf } from './index';
import { messages } from './pt-br';

describe('tf (mensagem com parâmetros)', () => {
  it('[RNF-USA-03] preenche o marcador {name} da saudação', () => {
    expect(tf('home.greeting', { name: 'Maria' })).toBe('Olá, Maria.');
  });

  it('[RNF-USA-03] não interpreta o valor como código: chaves e HTML no nome ficam literais', () => {
    expect(tf('home.greeting', { name: '{name} <b>x</b>' })).toBe('Olá, {name} <b>x</b>.');
  });

  it('[RNF-USA-03] faltou um parâmetro → erro claro (é bug de quem chama, nunca mostrar "{name}" ao usuário)', () => {
    expect(() => tf('home.greeting', {})).toThrow(/name/);
  });
});

describe('catálogo de textos da interface', () => {
  it('[RNF-USA-03] toda mensagem tem texto não vazio', () => {
    for (const [key, text] of Object.entries(messages)) {
      expect(text.trim(), `mensagem ${key}`).not.toBe('');
    }
  });

  it('[RNF-USA-03] os únicos marcadores {…} usados são os previstos', () => {
    const placeholders = Object.values(messages).flatMap((text) => text.match(/\{\w+\}/g) ?? []);

    expect(new Set(placeholders)).toEqual(new Set(['{name}']));
  });

  it('[RNF-USA-03] as telas de login e de conta têm todos os textos que usam', () => {
    for (const key of [
      'auth.login.title',
      'auth.login.email',
      'auth.login.password',
      'auth.login.submit',
      'nav.home',
      'nav.account',
      'account.title',
      'account.changePassword.submit',
      'account.logout',
    ] as const) {
      expect(t(key).length, key).toBeGreaterThan(0);
    }
  });
});

describe('catálogo i18n (pt-BR)', () => {
  it('[RNF-USA-03] t("app.name") devolve o nome padrão do sistema (OQ-27)', () => {
    expect(t('app.name')).toBe('PDV Pet Shop');
  });

  it('[RNF-USA-03] todo código de erro registrado tem mensagem pt-BR não vazia', () => {
    expect(ERROR_CODES.length).toBeGreaterThan(0);

    for (const code of ERROR_CODES) {
      expect(errorMessage(code).trim(), `mensagem de ${code}`).not.toBe('');
    }
  });

  it('[ADR-012] a mensagem para o usuário nunca expõe o código técnico', () => {
    for (const code of ERROR_CODES) {
      expect(errorMessage(code)).not.toContain(code);
    }
  });
});
