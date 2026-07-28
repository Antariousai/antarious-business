import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-sky-bright to-sky text-white shadow-sm shadow-sky/30 hover:brightness-105',
  secondary:
    'border border-sky/25 bg-white text-sky-bright shadow-sm hover:bg-sky-soft/60',
  ghost: 'bg-transparent text-muted hover:bg-neutral-100 hover:text-ink',
  danger:
    'bg-gradient-to-r from-coral to-rose-500 text-white shadow-sm shadow-coral/30 hover:brightness-105',
}

const SIZES: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-[12px]',
  md: 'min-h-10 px-4 text-[13px] sm:min-h-10 min-h-11',
  lg: 'min-h-11 px-5 text-[14px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children: ReactNode
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
