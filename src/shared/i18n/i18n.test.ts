import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '../errors';
import { errorMessage, t } from './index';

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
