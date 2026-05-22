'use client'

import { useState } from 'react'
import { deleteAccount } from '@/app/profile/actions'

interface Props {
  userEmail: string
}

export default function DeleteAccountForm({ userEmail }: Props) {
  const [inputEmail, setInputEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmed = inputEmail.trim().toLowerCase() === userEmail.toLowerCase()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const ok = window.confirm(
      'Are you absolutely sure? This cannot be undone.\n\nAll your predictions and league data will be permanently deleted.'
    )
    if (!ok) return

    setLoading(true)

    const formData = new FormData()
    formData.set('email', inputEmail.trim())

    const result = await deleteAccount(formData)

    // If we get here, deletion failed (success redirects server-side)
    setLoading(false)
    if (!result.success) {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-fg-muted">
        To confirm, type your email address:{' '}
        <span className="font-mono text-fg-secondary">{userEmail}</span>
      </p>

      <div>
        <label
          htmlFor="deleteEmail"
          className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5"
        >
          Email address
        </label>
        <input
          id="deleteEmail"
          type="email"
          value={inputEmail}
          onChange={e => setInputEmail(e.target.value)}
          placeholder={userEmail}
          autoComplete="off"
        />
      </div>

      {error && (
        <p className="text-sm text-status-live">{error}</p>
      )}

      <button
        type="submit"
        disabled={!confirmed || loading}
        className="w-full bg-red-700 text-white font-semibold uppercase tracking-wider rounded-lg px-4 py-2.5 hover:bg-red-600 disabled:opacity-40 transition-colors text-sm"
      >
        {loading ? 'Deleting…' : 'Delete my account permanently'}
      </button>
    </form>
  )
}
