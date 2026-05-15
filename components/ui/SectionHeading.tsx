import type { ReactNode } from 'react'
import Link from 'next/link'

interface SectionHeadingProps {
  children: ReactNode
  action?: { label: string; href: string }
}

export function SectionHeading({ children, action }: SectionHeadingProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-2xl font-display tracking-wider uppercase text-fg-primary">
        {children}
      </h2>
      {action && (
        <Link
          href={action.href}
          className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors"
        >
          {action.label} →
        </Link>
      )}
    </div>
  )
}
