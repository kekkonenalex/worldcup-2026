'use client'

import { useState } from 'react'
import Link from 'next/link'
import { markKnockoutAnnounceShown } from '@/app/welcome/actions'

export function KnockoutLivePopup({ initiallyShown }: { initiallyShown: boolean }) {
  const [open, setOpen] = useState(initiallyShown)

  async function dismiss() {
    setOpen(false)
    await markKnockoutAnnounceShown()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={dismiss}
    >
      <div
        className="bg-bg-card border-2 border-accent rounded-card p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h1 className="font-display text-accent text-2xl uppercase tracking-wide mb-4 leading-tight">
          Knockout stage scoring is live!
        </h1>

        <div className="space-y-3 text-fg-secondary text-sm mb-6">
          <p>
            Your Round of 32 points are in, and knockout matches now score in real time as teams
            advance through the bracket.
          </p>
          <p>See where you stand and how your league stacks up.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/leaderboard"
            onClick={dismiss}
            className="inline-flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover font-semibold uppercase tracking-wider rounded-lg transition-colors px-4 py-2 text-sm flex-1 text-center"
          >
            View leaderboard
          </Link>
          <Link
            href="/leagues"
            onClick={dismiss}
            className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-border-strong text-fg-primary hover:bg-bg-card-hover font-semibold uppercase tracking-wider rounded-lg transition-colors px-4 py-2 text-sm flex-1 text-center"
          >
            Your leagues
          </Link>
        </div>

        <button
          onClick={dismiss}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-transparent border-2 border-dashed border-border-dashed text-fg-muted hover:text-fg-primary hover:bg-bg-card-hover font-semibold uppercase tracking-wider rounded-lg transition-colors px-4 py-2 text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
