import type { ErrorCode } from '../errors';
import { errorMessages, messages } from './pt-br';

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey): string {
  return messages[key];
}

/**
 * Mensagem com marcadores `{nome}`. O valor entra como TEXTO literal (nada é interpretado);
 * parâmetro faltando é erro de quem chama, para nunca aparecer "{name}" na tela.
 */
export function tf(key: MessageKey, params: Record<string, string>): string {
  return t(key).replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`Parâmetro "${name}" ausente em "${key}"`);
    return value;
  });
}

export function errorMessage(code: ErrorCode): string {
  return errorMessages[code];
}
