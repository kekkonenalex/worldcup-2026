'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setupAccount } from '@/app/account/setup/actions'

interface Props {
  isReset: boolean
  initialDisplayName: string
}

export default function AccountSetupForm({ isReset, initialDisplayName }: Props) {
  const router = useRouter()

  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!isReset) {
      const trimmed = displayName.trim()
      if (trimmed.length < 2 || trimmed.length > 30) {
        setError('Display name must be 2–30 characters.')
        return
      }
    }

    setLoading(true)
    const result = await setupAccount({
      displayName: isReset ? undefined : displayName.trim(),
      password,
      isReset,
    })
    setLoading(false)

    if (result.success) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setError(result.error ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        {isReset ? 'Set a new password' : 'Welcome! Set up your account'}
      </h1>
      <p className="text-gray-400 text-sm mb-8">
        {isReset
          ? 'Choose a new password for your account.'
          : 'You only need to do this once.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isReset && (
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={30}
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-600 mt-1">
              How other players will see you. 2–30 characters.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
            {isReset ? 'New password' : 'Password'}
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
            {isReset ? 'Confirm new password' : 'Confirm password'}
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed px-4 py-2.5 font-semibold transition-colors"
        >
          {loading ? 'Saving…' : isReset ? 'Update password' : 'Create account'}
        </button>
      </form>
    </>
  )
}
