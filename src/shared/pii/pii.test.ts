import { describe, expect, it } from 'vitest';
import { isSensitiveKey } from './index';

describe('isSensitiveKey', () => {
  it.each([
    'name',
    'firstName',
    'lastName',
    'fullName',
    'customerName',
    'tutorName',
    'userName',
    'petName',
    'cpf',
    'CPF',
    'phone',
    'customerPhone',
    'telefone',
    'address',
    'endereco',
    'email',
    'password',
    'new_password',
    'senha',
    'token',
    'api-token',
    'authorization',
    'Authorization',
    'cookie',
    'secret',
    'apiKey',
    'databaseUrl',
    'DIRECT_URL',
  ])('[RNF-LGPD-05] a chave "%s" é sensível', (key) => {
    expect(isSensitiveKey(key)).toBe(true);
  });

  it.each([
    'id',
    'saleId',
    'userId',
    'quantity',
    'sku',
    'status',
    'createdAt',
    'description',
    'productName',
    'filename',
    'hostname',
  ])('[RNF-LGPD-05] a chave "%s" não é sensível', (key) => {
    expect(isSensitiveKey(key)).toBe(false);
  });

  it('[RNF-LGPD-05] ignora maiúsculas e separadores ao comparar', () => {
    expect(isSensitiveKey('E-Mail')).toBe(true);
    expect(isSensitiveKey('PASS_WORD')).toBe(true);
    expect(isSensitiveKey('first name')).toBe(true);
  });
});
