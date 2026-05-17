'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mainLoading, setMainLoading] = useState(false)
  const [mainError, setMainError] = useState<string | null>(null)

  const linkEmailRef = useRef<HTMLInputElement>(null)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkSent, setLinkSent] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('error_code=otp_expired')) {
      setMainError('This magic link has expired. Please request a new one below.')
    } else if (hash.includes('error=access_denied')) {
      setMainError('This link is no longer valid. Please request a new one below.')
    }
  }, [])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setMainLoading(true)
    setMainError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMainLoading(false)
    if (error) {
      setMainError('Incorrect email or password. Try again or request a sign-in link below.')
    } else {
      router.push('/')
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
    const { error } = await supabase.auth.signInWithOtp({
      email: linkEmail.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLinkLoading(false)
    if (error) setLinkError(error.message)
    else setLinkSent(true)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="font-display text-accent tracking-wide text-2xl mb-1">
            FIFA WORLD CUP 2026
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-fg-primary">Sign in</h1>
          <p className="text-fg-muted text-sm mt-1">Predictions</p>
        </div>

        <div className="bg-bg-card border border-border-subtle rounded-card p-6">
          {/* Email + password */}
          <form onSubmit={handleSignIn} className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5">
                Email
              </label>
              <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5">
                Password
              </label>
              <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {mainError && <p className="text-status-live text-sm">{mainError}</p>}
            <button
              type="submit"
              disabled={mainLoading}
              className="w-full bg-accent text-accent-fg font-semibold uppercase tracking-wider rounded-lg px-4 py-2.5 hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm"
            >
              {mainLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-xs text-fg-muted">or</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          {/* Sign-in link */}
          <div>
            <p className="text-sm font-medium text-fg-secondary mb-1">First time here, or forgot password?</p>
            <p className="text-xs text-fg-muted mb-4">Enter your email and we&apos;ll send a sign-in link.</p>

            {linkSent ? (
              <div className="rounded-lg bg-green-900/30 border border-green-700/50 px-4 py-4 text-green-300">
                <p className="font-medium">Check your email — sign-in link sent.</p>
                <p className="text-sm mt-1 text-green-400/80">Don&apos;t see it? Check spam.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <input ref={linkEmailRef} type="email" value={linkEmail} onChange={e => setLinkEmail(e.target.value)} placeholder="you@example.com" />
                {linkError && <p className="text-status-live text-sm">{linkError}</p>}
                <button
                  type="button"
                  disabled={linkLoading}
                  onClick={() => sendLink(false)}
                  className="w-full border-2 border-dashed border-border-dashed text-fg-primary font-semibold uppercase tracking-wider rounded-lg px-4 py-2.5 hover:bg-bg-card-hover disabled:opacity-50 transition-colors text-sm"
                >
                  {linkLoading ? 'Sending…' : 'Send Sign-In Link'}
                </button>
                <button
                  type="button"
                  disabled={linkLoading}
                  onClick={() => sendLink(true)}
                  className="block w-full text-center text-xs text-fg-muted hover:text-fg-secondary py-1 transition-colors"
                >
                  Already have an account? Forgot password — send a reset link.
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
