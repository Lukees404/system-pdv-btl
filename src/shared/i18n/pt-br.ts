import type { ErrorCode } from '../errors';

/**
 * Catálogo único de textos da interface (ADR-014, RNF-USA-03).
 * `Record<ErrorCode, …>` faz o compilador exigir uma mensagem para cada código novo.
 */
export const errorMessages: Record<ErrorCode, string> = {
  INVALID_MONEY: 'Valor em dinheiro inválido.',
  INVALID_QUANTITY: 'A quantidade deve ser um número inteiro maior ou igual a 1.',
  INVALID_PERCENT: 'O percentual deve estar entre 0 e 100, com no máximo 2 casas decimais.',
  INVALID_ALLOCATION: 'Não foi possível ratear o valor entre os itens.',
  INVALID_ENV: 'A configuração do sistema está incompleta ou inválida.',
  AUDIT_PII_FORBIDDEN: 'A auditoria não pode registrar dados pessoais.',
  WEAK_PASSWORD: 'A senha deve ter entre 10 e 128 caracteres.',
  INVALID_EMAIL: 'Informe um e-mail válido.',
  INVALID_NAME: 'Informe o nome, com até 100 caracteres.',
  EMAIL_TAKEN: 'Já existe um usuário com este e-mail.',
  // Mesmo texto para credencial errada e conta bloqueada: não revela se o e-mail existe.
  INVALID_CREDENTIALS:
    'E-mail ou senha incorretos, ou acesso temporariamente bloqueado. Tente novamente em alguns minutos.',
  UNAUTHENTICATED: 'Você precisa entrar para continuar.',
  CURRENT_PASSWORD_INCORRECT: 'A senha atual está incorreta.',
  INVALID_INPUT: 'Confira os campos e tente novamente.',
  PASSWORD_MISMATCH: 'A confirmação não confere com a nova senha.',
  ACCOUNT_LOCKED:
    'E-mail ou senha incorretos, ou acesso temporariamente bloqueado. Tente novamente em alguns minutos.',
};

export const messages = {
  'app.name': 'PDV Pet Shop',
  'app.skipToContent': 'Ir para o conteúdo',

  'nav.label': 'Navegação principal',
  'nav.home': 'Início',
  'nav.account': 'Conta',

  'home.title': 'Início',
  'home.greeting': 'Olá, {name}.',

  'auth.login.title': 'Entrar',
  'auth.login.email': 'E-mail',
  'auth.login.password': 'Senha',
  'auth.login.submit': 'Entrar',
  'auth.login.submitting': 'Entrando…',

  'account.title': 'Conta',
  'account.changePassword.title': 'Trocar senha',
  'account.changePassword.hint':
    'Use de 10 a 128 caracteres. Os outros aparelhos serão desconectados.',
  'account.changePassword.current': 'Senha atual',
  'account.changePassword.new': 'Nova senha',
  'account.changePassword.confirm': 'Confirmar nova senha',
  'account.changePassword.submit': 'Trocar senha',
  'account.changePassword.submitting': 'Trocando…',
  'account.changePassword.success': 'Senha alterada. Os outros aparelhos foram desconectados.',
  'account.logout': 'Sair',
} as const;
