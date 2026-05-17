'use client'

import { useState } from 'react'
import { changePassword } from '@/app/profile/actions'

export default function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    const result = await changePassword(newPassword)
    setLoading(false)

    if (result.success) {
      setNewPassword('')
      setConfirmPassword('')
      setMessage({ type: 'success', text: 'Password updated successfully.' })
    } else {
      setMessage({ type: 'error', text: result.error })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="newPassword"
          className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5"
        >
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          required
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="At least 6 characters"
          autoComplete="new-password"
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5"
        >
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Repeat your password"
          autoComplete="new-password"
        />
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-status-live'}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-accent text-accent-fg font-semibold uppercase tracking-wider rounded-lg px-4 py-2.5 hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm"
      >
        {loading ? 'Updating…' : 'Update Password'}
      </button>
    </form>
  )
}
