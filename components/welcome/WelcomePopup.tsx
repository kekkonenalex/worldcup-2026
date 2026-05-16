'use client'

import { useState } from 'react'
import Link from 'next/link'
import { markWelcomeShown } from '@/app/welcome/actions'

export function WelcomePopup({ initiallyShown }: { initiallyShown: boolean }) {
  const [open, setOpen] = useState(initiallyShown)

  async function dismiss() {
    setOpen(false)
    await markWelcomeShown()
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
          Welcome to FIFA World Cup 2026 Predictions
        </h1>

        <div className="space-y-3 text-fg-secondary text-sm mb-6">
          <p>Predict the entire FIFA World Cup 2026 tournament — from the group stage all the way to the final.</p>
          <p>Create a private league with your friends and compete to see who calls it best.</p>
          <p>Before you start, take a minute to read how predictions and scoring work.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/rules"
            onClick={dismiss}
            className="inline-flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover font-semibold uppercase tracking-wider rounded-lg transition-colors px-4 py-2 text-sm flex-1 text-center"
          >
            Read the rules
          </Link>
          <button
            onClick={dismiss}
            className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-dashed border-border-dashed text-fg-primary hover:bg-bg-card-hover font-semibold uppercase tracking-wider rounded-lg transition-colors px-4 py-2 text-sm flex-1"
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  )
}
