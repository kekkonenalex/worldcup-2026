import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { timeUntilDeadline, isPastDeadline } from '@/lib/config'

const STEPS = [
  {
    n: '1',
    title: 'Sign in with email',
    body: 'No password needed on your first visit — just your email. A sign-in link is sent to you instantly.',
  },
  {
    n: '2',
    title: 'Submit your predictions',
    body: 'Pick scores for all 72 group matches, fill in the entire knockout bracket, and call the tournament awards.',
  },
  {
    n: '3',
    title: 'Compete with friends',
    body: 'Join a private league, share an invite code, and watch the leaderboard update as results come in.',
  },
]

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const locked = isPastDeadline()
  const countdown = timeUntilDeadline()

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-12 text-center">
        <div className="inline-block rounded-full bg-blue-900/40 border border-blue-700 px-3 py-1 text-xs font-semibold text-blue-300 uppercase tracking-widest mb-6">
          FIFA World Cup 2026
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight max-w-2xl mb-5">
          World Cup 2026<br />Predictions
        </h1>

        <p className="text-lg sm:text-xl text-gray-400 max-w-xl mb-10">
          Compete with friends. Pick every match, every bracket, every award. The most accurate predictor wins.
        </p>

        <Link
          href="/login"
          className="inline-block rounded-xl bg-blue-600 hover:bg-blue-500 px-8 py-3.5 font-semibold text-lg transition-colors"
        >
          Sign in to play →
        </Link>

        {/* Deadline */}
        <div className="mt-8 text-sm text-gray-500">
          {locked ? (
            <span className="text-red-400 font-medium">Prediction deadline has passed.</span>
          ) : (
            <>
              <span>Predictions lock on </span>
              <span className="text-gray-300 font-medium">June 10, 2026 at 23:59 (Helsinki time)</span>
              <span className="text-gray-600"> — </span>
              <span className="tabular-nums text-gray-400">
                {countdown.days}d {countdown.hours}h {countdown.minutes}m remaining
              </span>
            </>
          )}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-4 pb-20 max-w-4xl mx-auto w-full">
        <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-gray-600 mb-8">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STEPS.map(step => (
            <div
              key={step.n}
              className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-5"
            >
              <div className="w-7 h-7 rounded-full bg-blue-900/50 border border-blue-700 flex items-center justify-center text-xs font-bold text-blue-300 mb-3">
                {step.n}
              </div>
              <p className="font-semibold text-white mb-1">{step.title}</p>
              <p className="text-sm text-gray-400 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="text-center text-xs text-gray-700 pb-8 px-4">
        Built with Next.js + Supabase. Not affiliated with FIFA.
      </footer>

    </main>
  )
}
