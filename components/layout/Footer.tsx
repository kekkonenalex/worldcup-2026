import Link from 'next/link'

const LINKS = [
  { label: 'Rules', href: '/rules' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Support', href: '/support' },
]

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle py-8 mt-16 text-center">
      <p className="font-display text-accent tracking-wide text-lg mb-4">
        FIFA WORLD CUP 2026 PREDICTIONS
      </p>
      <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
        {LINKS.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="text-xs uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
      <p className="text-xs text-fg-muted">
        © 2026 FIFA World Cup Predictor — built for friends, not affiliated with FIFA.
      </p>
    </footer>
  )
}
