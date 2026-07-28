import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-ink">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

const inputClass =
  'h-10 w-full rounded-[var(--radius-control)] border border-neutral-200 bg-white px-3 text-[13px] text-ink outline-none focus:border-sky focus:ring-2 focus:ring-sky/20'

export function Input({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`} {...rest} />
}

export function TextArea({
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-[88px] w-full rounded-[var(--radius-control)] border border-neutral-200 bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-sky focus:ring-2 focus:ring-sky/20 ${className}`}
      {...rest}
    />
  )
}

/** Label + controlled text input — drop-in for FieldInput copies */
export function FieldInput({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <Field label={label}>
      <Input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}
