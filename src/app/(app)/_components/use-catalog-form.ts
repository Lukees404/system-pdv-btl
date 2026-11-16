'use client';

import { useActionState } from 'react';
import type { FormActionResult } from '@/modules/catalog';

export type CatalogFormState = {
  result: FormActionResult | null;
  /** O que foi digitado: o React limpa os campos depois da ação, e erro não pode custar a digitação. */
  values: Record<string, string>;
};

const INITIAL: CatalogFormState = { result: null, values: {} };

/** Liga um formulário a uma Server Action do catálogo e guarda o que a pessoa digitou. */
export function useCatalogForm(action: (formData: FormData) => Promise<FormActionResult>) {
  const [state, formAction, isPending] = useActionState(
    async (_previous: CatalogFormState, formData: FormData): Promise<CatalogFormState> => {
      const values: Record<string, string> = {};
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') values[key] = value;
      }
      return { result: await action(formData), values };
    },
    INITIAL,
  );

  const failure = state.result && !state.result.ok ? state.result : null;
  return {
    formAction,
    isPending,
    values: state.values,
    /** Mensagem do campo `name`, se o erro é dele. */
    errorFor: (name: string) => (failure?.field === name ? failure.message : undefined),
    /** Mensagem que não pertence a nenhum campo. */
    formError: failure && !failure.field ? failure.message : undefined,
  };
}
