'use client'

import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg hover:bg-accent-hover font-semibold uppercase tracking-wider rounded-lg transition-colors',
  outline:
    'bg-transparent border-2 border-dashed border-border-dashed text-fg-primary hover:bg-bg-card-hover uppercase tracking-wider font-semibold rounded-lg transition-colors',
  ghost:
    'bg-transparent text-fg-secondary hover:text-fg-primary uppercase tracking-wider font-semibold transition-colors',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  )
}
