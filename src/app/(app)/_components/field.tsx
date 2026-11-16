import type { ReactNode } from 'react';

type CommonProps = {
  name: string;
  /** Só quando o mesmo `name` aparece em mais de um formulário da página (ids precisam ser únicos). */
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
};

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

function Wrapper({
  id,
  label,
  hint,
  error,
  children,
}: CommonProps & { id: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = CommonProps & {
  defaultValue?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
  maxLength?: number;
  autoComplete?: string;
};

/** Campo de texto com rótulo, dica e erro ligados por `aria-describedby` (WCAG 2.1 AA). */
export function TextField({
  name,
  id = name,
  label,
  hint,
  error,
  required,
  defaultValue,
  inputMode,
  maxLength,
  autoComplete = 'off',
}: TextFieldProps) {
  return (
    <Wrapper id={id} name={name} label={label} hint={hint} error={error}>
      <input
        id={id}
        name={name}
        type="text"
        defaultValue={defaultValue}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
      />
    </Wrapper>
  );
}

type SelectFieldProps = CommonProps & {
  defaultValue?: string;
  options: readonly { value: string; label: string }[];
};

export function SelectField({
  name,
  id = name,
  label,
  hint,
  error,
  defaultValue,
  options,
}: SelectFieldProps) {
  return (
    <Wrapper id={id} name={name} label={label} hint={hint} error={error}>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ''}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}
