import type { HTMLAttributes } from 'react'

type Variant = 'default' | 'highlighted'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-bg-card border border-border-subtle rounded-card p-5',
  highlighted:
    'bg-bg-card border border-accent rounded-card p-5 shadow-[0_0_0_1px_var(--accent)]',
}

export function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
  return (
    <div {...props} className={`${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`text-xs uppercase tracking-wider text-fg-muted font-semibold mb-3 ${className}`}
    >
      {children}
    </div>
  )
}

export function CardBody({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={className}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`mt-4 pt-4 border-t border-border-subtle ${className}`}
    >
      {children}
    </div>
  )
}
