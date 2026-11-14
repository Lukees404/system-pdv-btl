import type { ErrorCode } from '../errors';
import { errorMessages, messages } from './pt-br';

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey): string {
  return messages[key];
}

export function errorMessage(code: ErrorCode): string {
  return errorMessages[code];
}
