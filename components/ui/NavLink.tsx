'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  /** Match by prefix instead of exact path */
  prefixMatch?: boolean
}

export function NavLink({ href, children, prefixMatch = true }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = prefixMatch
    ? pathname === href || (href !== '/' && pathname.startsWith(href))
    : pathname === href

  return (
    <Link
      href={href}
      className={
        isActive
          ? 'border-b-2 border-accent text-fg-primary text-sm font-semibold uppercase tracking-wider pb-0.5 transition-colors'
          : 'border border-dashed border-border-dashed text-fg-muted hover:text-fg-primary text-sm font-semibold uppercase tracking-wider rounded px-2 py-0.5 transition-colors'
      }
    >
      {children}
    </Link>
  )
}
