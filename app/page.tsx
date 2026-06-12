import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { WelcomePopup } from '@/components/welcome/WelcomePopup'
import type { Profile } from '@/types/database'

const STEPS = [
  { n: '1', title: 'Sign in', body: 'No password needed on first visit — just your email. A sign-in link arrives instantly.' },
  { n: '2', title: 'Submit predictions', body: 'Pick scores for all 72 group matches, fill the knockout bracket, and call the awards.' },
  { n: '3', title: 'Compete', body: 'Join a private league, share an invite code, and watch the leaderboard update live.' },
]

const CARDS = [
  { label: 'My Profile', icon: '🔐', desc: 'Your personal prediction history and score breakdown.', href: '/users/[me]' },
  { label: 'My Leagues', icon: '🏅', desc: 'Compete in private leagues with friends and colleagues.', href: '/leagues' },
  { label: 'Tournament Hub', icon: '🏆', desc: 'Live standings, bracket, golden boot, and more.', href: '/tournament' },
  { label: 'View Leaderboard', icon: '📊', desc: 'See the global standings and where you rank.', href: '/leaderboard' },
]

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  let welcomeShown = true
  if (user) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('is_admin, welcome_shown')
      .eq('id', user.id)
      .single()
    const profile = profileRow as Pick<Profile, 'is_admin' | 'welcome_shown'> | null
    isAdmin = !!profile?.is_admin
    welcomeShown = !!profile?.welcome_shown
  }

  return (
    <div className="pb-16">
      {/* ── Hero ── */}
      <section className="py-16 md:py-24 text-center max-w-3xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-display tracking-wide uppercase text-fg-primary mb-4 leading-none">
          FIFA World Cup<br />2026 Predictions
        </h1>
        <p className="text-fg-secondary text-lg mb-10 max-w-xl mx-auto">
          Compete with friends. Pick every match, every bracket, every award. The most accurate predictor wins.
        </p>

        {!user && (
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/login" className="bg-accent text-accent-fg font-semibold uppercase tracking-wider rounded-lg px-6 py-3 hover:bg-accent-hover transition-colors text-sm">
              Sign In to Play
            </Link>
            <Link href="/leaderboard" className="border-2 border-dashed border-border-dashed text-fg-primary font-semibold uppercase tracking-wider rounded-lg px-6 py-3 hover:bg-bg-card-hover transition-colors text-sm">
              View Leaderboard
            </Link>
          </div>
        )}
      </section>

      {/* ── Quick-nav cards (authenticated) ── */}
      {user && (
        <section className="mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {CARDS.map(c => {
              const href = c.href === '/users/[me]' ? `/users/${user.id}` : c.href
              return (
                <Link key={c.label} href={href} className="block group">
                  <Card className="h-full hover:border-border-strong transition-colors group-hover:border-border-strong">
                    <div className="text-3xl mb-3">{c.icon}</div>
                    <h3 className="font-semibold text-fg-primary mb-1">{c.label}</h3>
                    <p className="text-xs text-fg-muted leading-relaxed">{c.desc}</p>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Admin ── */}
      {user && isAdmin && (
        <div className="max-w-3xl mx-auto mb-8">
          <Link
            href="/admin"
            className="block w-full text-center rounded-xl px-4 py-3.5 font-semibold text-sm uppercase tracking-wider transition-colors bg-amber-700 hover:bg-amber-600 text-white"
          >
            Admin: Manage Match Results →
          </Link>
        </div>
      )}

      {/* ── How it works ── */}
      {!user && (
        <section className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-fg-muted mb-8">
            How it works
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STEPS.map(step => (
              <Card key={step.n}>
                <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent mb-3">
                  {step.n}
                </div>
                <p className="font-semibold text-fg-primary mb-1">{step.title}</p>
                <p className="text-sm text-fg-muted leading-relaxed">{step.body}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
      {user && <WelcomePopup initiallyShown={!welcomeShown} />}
    </div>
  )
}
