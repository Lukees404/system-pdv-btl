import { createHash, randomBytes } from 'node:crypto';
import type { SessionTokens } from '../application/ports';

const TOKEN_BYTES = 32;

/**
 * Token = 32 bytes aleatórios do sistema operacional, em base64url (43 caracteres, seguro
 * para cookie). O banco guarda só o SHA-256: quem lê a tabela `sessions` não consegue
 * montar um cookie válido (RNF-SEG-02). SHA-256 simples basta porque o token já é aleatório
 * e de alta entropia (diferente de senha, que exige hash lento).
 */
export class RandomSessionTokens implements SessionTokens {
  generate(): string {
    return randomBytes(TOKEN_BYTES).toString('base64url');
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
