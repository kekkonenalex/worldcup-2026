'use client'

import { useState, useEffect } from 'react'
import { changeUsername } from '@/app/profile/actions'

interface Props {
  currentDisplayName: string
}

export default function ChangeUsernameForm({ currentDisplayName }: Props) {
  const [value, setValue] = useState(currentDisplayName)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (message?.type === 'success') {
      const t = setTimeout(() => setMessage(null), 3000)
      return () => clearTimeout(t)
    }
  }, [message])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.set('displayName', value)

    const result = await changeUsername(formData)
    setLoading(false)

    if (result.success) {
      setMessage({ type: 'success', text: 'Username updated.' })
    } else {
      setMessage({ type: 'error', text: result.error })
    }
  }

  const isUnchanged = value.trim() === currentDisplayName

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="displayName"
          className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5"
        >
          Username
        </label>
        <input
          id="displayName"
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          maxLength={30}
          autoComplete="username"
          placeholder="Your display name"
        />
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-status-live'}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || isUnchanged || !value.trim()}
        className="w-full bg-accent text-accent-fg font-semibold uppercase tracking-wider rounded-lg px-4 py-2.5 hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm"
      >
        {loading ? 'Saving…' : 'Save Username'}
      </button>
    </form>
  )
}
