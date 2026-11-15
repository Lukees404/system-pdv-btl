'use server';

import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth';
import { performChangePassword, performLogout, type ActionResult } from '@/modules/auth';

// Ações finas (ADR-019): a autorização (`currentUser`) é feita dentro de `performChangePassword`,
// em cada chamada, e não depende do proxy nem de esconder o botão.
export async function changePasswordAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return performChangePassword(await getAuthContext(), Object.fromEntries(formData));
}

export async function logoutAction(): Promise<void> {
  await performLogout(await getAuthContext());
  redirect('/login');
}
