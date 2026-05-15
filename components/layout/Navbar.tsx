import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NavLink } from '@/components/ui/NavLink'
import { MobileMenu } from '@/components/layout/MobileMenu'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/leagues', label: 'Leagues' },
  { href: '/predictions', label: 'Predictions' },
]

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-50 bg-bg-base/80 backdrop-blur border-b border-border-subtle">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className="shrink-0">
          <span className="font-display text-accent tracking-wide uppercase leading-none text-xl md:text-2xl">
            FIFA<br className="hidden sm:block md:hidden" />
            <span className="hidden sm:inline md:hidden"> </span>
            <span className="sm:hidden"> </span>
            World Cup
            <span className="text-fg-muted text-base ml-1">2026</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5">
          {NAV_LINKS.map(l => (
            <NavLink key={l.href} href={l.href}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <Link
                href="/predictions"
                className="bg-accent text-accent-fg text-xs font-semibold uppercase tracking-wider rounded-lg px-4 py-2 hover:bg-accent-hover transition-colors"
              >
                Place Prediction
              </Link>
              <Link
                href={`/users/${user.id}`}
                className="w-8 h-8 rounded-full bg-bg-card border border-border-strong flex items-center justify-center text-fg-secondary hover:text-fg-primary hover:border-accent transition-colors text-sm font-semibold"
                aria-label="My profile"
              >
                {user.email?.[0]?.toUpperCase() ?? '?'}
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <MobileMenu userId={user?.id ?? null} />
      </nav>
    </header>
  )
}
