'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NavLink } from '@/components/ui/NavLink'

interface MobileMenuProps {
  userId: string | null
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/leagues', label: 'Leagues' },
  { href: '/predictions', label: 'Predictions' },
]

export function MobileMenu({ userId }: MobileMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle menu"
        className="p-2 text-fg-muted hover:text-fg-primary transition-colors"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="17" y2="6" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="14" x2="17" y2="14" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 bg-bg-elevated border-b border-border-subtle py-4 px-4 flex flex-col gap-3"
          onClick={() => setOpen(false)}
        >
          {NAV_LINKS.map(l => (
            <NavLink key={l.href} href={l.href}>
              {l.label}
            </NavLink>
          ))}
          {userId ? (
            <Link
              href="/predictions"
              className="mt-2 block text-center bg-accent text-accent-fg text-sm font-semibold uppercase tracking-wider rounded-lg px-4 py-2 hover:bg-accent-hover transition-colors"
            >
              Place Prediction
            </Link>
          ) : (
            <Link
              href="/login"
              className="mt-2 block text-center text-sm font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
