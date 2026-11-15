// Dados pessoais e segredos (RNF-LGPD-05, RNF-SEG-06). Lista única, usada pelo logger e
// pela auditoria: duplicá-la faria as duas divergirem. A chave é normalizada (minúscula,
// sem separadores) e depois comparada.
const EXACT_PII_KEYS = new Set([
  'name',
  'firstname',
  'lastname',
  'fullname',
  'customername',
  'tutorname',
  'username',
  'petname',
]);

const PII_KEY_PARTS = [
  'cpf',
  'phone',
  'telefone',
  'address',
  'endereco',
  'email',
  'password',
  'senha',
  'token',
  'authorization',
  'cookie',
  'secret',
  'databaseurl',
  'directurl',
  'apikey',
];

/** Diz se o NOME de um campo costuma conter dado pessoal ou segredo. */
export function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return EXACT_PII_KEYS.has(normalized) || PII_KEY_PARTS.some((part) => normalized.includes(part));
}
