'use server';

import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth';
import { performLogin, type ActionResult } from '@/modules/auth';

// Ação fina (ADR-019): a validação, o caso de uso e a gravação do cookie ficam em `performLogin`.
export async function loginAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  const result = await performLogin(await getAuthContext(), Object.fromEntries(formData));
  if (result.ok) redirect('/');
  return result;
}
