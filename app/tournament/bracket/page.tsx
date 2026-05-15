import Link from 'next/link'

export default function TournamentBracketPage() {
  return (
    <div className="max-w-2xl mx-auto py-16 text-center">
      <h1 className="text-5xl font-display uppercase tracking-wide text-fg-primary mb-4">
        Full Bracket
      </h1>
      <p className="text-fg-muted mb-8">Full bracket view coming soon.</p>
      <Link href="/tournament" className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors border border-dashed border-border-dashed rounded px-4 py-2">
        ← Tournament Hub
      </Link>
    </div>
  )
}
