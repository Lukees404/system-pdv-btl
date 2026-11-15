import { z } from 'zod';

// Validação nas bordas (RNF-SEG-05, ADR-012): a entrada de formulário é `unknown` até passar
// por aqui. Os tetos de tamanho evitam gastar memória/CPU com entradas gigantes; as regras de
// negócio (senha de 10 a 128 caracteres etc.) continuam nos casos de uso. Campos extras (como
// os `$ACTION_ID_*` que o Next acrescenta) são descartados.
const MAX_EMAIL_INPUT = 320;
const MAX_PASSWORD_INPUT = 1024;

export const loginSchema = z.object({
  email: z.string().max(MAX_EMAIL_INPUT),
  password: z.string().max(MAX_PASSWORD_INPUT),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().max(MAX_PASSWORD_INPUT),
  newPassword: z.string().max(MAX_PASSWORD_INPUT),
  confirmPassword: z.string().max(MAX_PASSWORD_INPUT),
});
