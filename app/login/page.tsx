'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()

  // ── Main email + password form ──
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mainLoading, setMainLoading] = useState(false)
  const [mainError, setMainError] = useState<string | null>(null)

  // ── Sign-in link / reset form ──
  const linkEmailRef = useRef<HTMLInputElement>(null)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkSent, setLinkSent] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setMainLoading(true)
    setMainError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMainLoading(false)
    if (error) {
      setMainError('Incorrect email or password. Try again or request a new sign-in link below.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function sendLink(isReset: boolean) {
    if (!linkEmail.trim()) {
      setLinkError('Please enter your email address.')
      linkEmailRef.current?.focus()
      return
    }
    setLinkLoading(true)
    setLinkError(null)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback${isReset ? '?reset=true' : ''}`
    const { error } = await supabase.auth.signInWithOtp({
      email: linkEmail.trim(),
      options: { emailRedirectTo: redirectTo },
    })
    setLinkLoading(false)
    if (error) {
      setLinkError(error.message)
    } else {
      setLinkSent(true)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <h1 className="text-3xl font-bold tracking-tight mb-1">Sign in</h1>
        <p className="text-gray-500 text-sm mb-8">World Cup 2026 Predictions</p>

        {/* ── Email + password ── */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {mainError && (
            <p className="text-red-400 text-sm">{mainError}</p>
          )}

          <button
            type="submit"
            disabled={mainLoading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed px-4 py-2.5 font-semibold transition-colors"
          >
            {mainLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* ── Divider ── */}
        <div className="my-8 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-600">or</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* ── Sign-in link / password reset ── */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-1">First time here, or forgot your password?</p>
          <p className="text-xs text-gray-600 mb-4">
            Enter your email and we&apos;ll send you a sign-in link.
          </p>

          {linkSent ? (
            <div className="rounded-lg bg-green-900/40 border border-green-700 px-4 py-4 text-green-300">
              <p className="font-medium">Check your email — we sent you a sign-in link.</p>
              <p className="text-sm mt-1 text-green-400">Don&apos;t see it? Check your spam folder.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={linkEmailRef}
                type="email"
                value={linkEmail}
                onChange={e => setLinkEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {linkError && (
                <p className="text-red-400 text-sm">{linkError}</p>
              )}

              <button
                type="button"
                disabled={linkLoading}
                onClick={() => sendLink(false)}
                className="w-full rounded-lg border border-gray-700 hover:border-gray-500 px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white disabled:opacity-50 transition-colors"
              >
                {linkLoading ? 'Sending…' : 'Send sign-in link'}
              </button>

              <button
                type="button"
                disabled={linkLoading}
                onClick={() => sendLink(true)}
                className="block w-full text-center text-xs text-gray-600 hover:text-gray-400 py-1 transition-colors"
              >
                Already have an account? Forgot your password — send a reset link instead.
              </button>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
