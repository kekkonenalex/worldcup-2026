import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isPastDeadline, timeUntilDeadline } from '@/lib/config'
import SignOutButton from '@/components/SignOutButton'
import { Card } from '@/components/ui/Card'
import { WelcomePopup } from '@/components/welcome/WelcomePopup'
import type { Profile, AwardPrediction } from '@/types/database'

function countAwards(award: AwardPrediction | null): number {
  if (!award) return 0
  return [
    award.golden_boot_player?.trim(),
    award.golden_boot_goals != null ? String(award.golden_boot_goals) : '',
    award.golden_ball_player?.trim(),
    award.golden_glove_player?.trim(),
    award.best_young_player?.trim(),
  ].filter(v => v && v !== '').length
}

function StatusRow({ label, current, total, dimmed }: { label: string; current: number; total: number; dimmed?: boolean }) {
  const complete = current === total
  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-border-subtle last:border-0 ${dimmed ? 'opacity-40' : ''}`}>
      <span className="text-sm shrink-0">{complete ? '✅' : '⚠️'}</span>
      <span className="text-sm text-fg-secondary flex-1">{label}</span>
      <span className={`text-sm font-mono tabular-nums font-bold ${complete ? 'text-green-400' : 'text-accent'}`}>
        {current} / {total}
      </span>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = data as Profile | null

  const [
    { count: groupCount },
    { count: knockoutCount },
    { data: awardRows },
    { data: leagueMemberships },
  ] = await Promise.all([
    supabase.from('group_predictions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('knockout_predictions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('award_predictions').select('*').eq('user_id', user.id).limit(1),
    supabase.from('league_memberships').select('league_id, league:leagues(id, name)').eq('user_id', user.id),
  ])

  type LeagueRef = { id: number; name: string }
  const userLeagues = ((leagueMemberships ?? []) as unknown as { league: LeagueRef | null }[])
    .map(m => m.league).filter((l): l is LeagueRef => l !== null)

  const groupPreds = groupCount ?? 0
  const knockoutPreds = knockoutCount ?? 0
  const awardPrediction = (awardRows?.[0] ?? null) as AwardPrediction | null
  const awardsCount = countAwards(awardPrediction)

  const groupComplete = groupPreds === 72
  const knockoutComplete = knockoutPreds === 32
  const awardsComplete = awardsCount === 5
  const allComplete = groupComplete && knockoutComplete && awardsComplete

  const locked = isPastDeadline()
  const countdown = timeUntilDeadline()

  let ctaHref: string, ctaLabel: string
  if (!groupComplete) { ctaHref = '/predictions'; ctaLabel = locked ? 'View Group Predictions' : 'Continue Group Stage →' }
  else if (!knockoutComplete) { ctaHref = '/predictions/knockout'; ctaLabel = locked ? 'View Knockout Bracket' : 'Continue Knockout Bracket →' }
  else if (!awardsComplete) { ctaHref = '/predictions/awards'; ctaLabel = locked ? 'View Awards' : 'Finish Awards Predictions →' }
  else { ctaHref = '/predictions/summary'; ctaLabel = 'View My Predictions Summary →' }

  return (
    <div className="max-w-xl mx-auto pb-16 pt-4">
      {/* Welcome */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-display tracking-wide uppercase text-fg-primary mb-1">
          {profile?.display_name ?? user.email}
        </h1>
        <p className="text-fg-muted text-sm">{user.email}</p>
      </div>

      {/* Deadline */}
      <Card className="mb-4">
        {locked ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-status-live/20 border border-status-live/40 px-2.5 py-0.5 text-status-live text-xs font-semibold uppercase tracking-wide">
              Locked
            </span>
            <span className="text-fg-muted text-sm">Prediction deadline has passed.</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-fg-muted text-sm">Deadline closes in</span>
            <span className="font-bold text-fg-primary tabular-nums">
              {countdown.days}d {countdown.hours}h {countdown.minutes}m
            </span>
          </div>
        )}
      </Card>

      {/* Predictions status */}
      <Card className="mb-4 !p-0 overflow-hidden">
        <div className="px-5 pt-4 pb-1">
          <StatusRow label="Group Stage Predictions" current={groupPreds} total={72} />
          <StatusRow label="Knockout Bracket" current={knockoutPreds} total={32} dimmed={!groupComplete} />
          <StatusRow label="Tournament Awards" current={awardsCount} total={5} dimmed={!knockoutComplete} />
        </div>
      </Card>

      {/* Primary CTA */}
      <Link
        href={ctaHref}
        className={`block w-full text-center rounded-xl px-4 py-3.5 font-semibold text-sm uppercase tracking-wider transition-colors mb-4 ${
          allComplete
            ? 'bg-green-700 hover:bg-green-600 text-white'
            : locked
            ? 'bg-bg-card text-fg-muted border border-border-subtle'
            : 'bg-accent hover:bg-accent-hover text-accent-fg'
        }`}
      >
        {ctaLabel}
      </Link>

      {/* Quick links */}
      {!allComplete && (
        <div className="flex flex-wrap gap-2 justify-center mb-6 text-xs">
          {[
            { href: '/predictions', label: 'Group Stage' },
            { href: '/predictions/review', label: 'Standings Review' },
            { href: '/predictions/knockout', label: 'Knockout Bracket' },
            { href: '/predictions/awards', label: 'Awards' },
          ].map(l => (
            <Link key={l.href} href={l.href} className="text-fg-muted hover:text-fg-secondary transition-colors">
              {l.label}
            </Link>
          )).reduce<React.ReactNode[]>((acc, el, i) => {
            if (i > 0) acc.push(<span key={`dot-${i}`} className="text-border-subtle">·</span>)
            acc.push(el)
            return acc
          }, [])}
        </div>
      )}

      {/* Tournament Hub */}
      <Link href="/tournament" className="block w-full text-center rounded-xl px-4 py-3.5 font-semibold text-sm uppercase tracking-wider transition-colors mb-4 bg-bg-card border border-border-subtle hover:border-border-strong text-fg-secondary hover:text-fg-primary">
        Tournament Hub →
      </Link>

      {/* Leaderboard */}
      <Link href="/leaderboard" className="block w-full text-center rounded-xl px-4 py-3.5 font-semibold text-sm uppercase tracking-wider transition-colors mb-4 bg-bg-card border border-border-subtle hover:border-border-strong text-fg-secondary hover:text-fg-primary">
        Global Leaderboard →
      </Link>

      {/* Leagues */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-xs uppercase tracking-wider text-fg-muted">My Leagues</h2>
          {userLeagues.length > 0 && (
            <Link href="/leagues" className="text-xs text-accent hover:underline">Manage →</Link>
          )}
        </div>
        {userLeagues.length === 0 ? (
          <Link href="/leagues" className="block w-full text-center rounded-lg border border-dashed border-border-dashed hover:border-border-strong px-4 py-2.5 text-sm font-medium text-fg-muted hover:text-fg-primary transition-colors">
            Create or Join a League →
          </Link>
        ) : (
          <div className="space-y-1.5">
            {userLeagues.map(l => (
              <Link key={l.id} href={`/leagues/${l.id}`} className="flex items-center justify-between rounded-lg bg-bg-elevated hover:bg-bg-card-hover px-3 py-2 transition-colors">
                <span className="text-sm text-fg-secondary">{l.name}</span>
                <span className="text-xs text-fg-muted">→</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Admin */}
      {profile?.is_admin && (
        <Link href="/admin" className="block w-full text-center rounded-xl px-4 py-3.5 font-semibold text-sm uppercase tracking-wider transition-colors mb-4 bg-amber-700 hover:bg-amber-600 text-white">
          Admin: Manage Match Results →
        </Link>
      )}

      <div className="flex justify-center">
        <SignOutButton />
      </div>

      <WelcomePopup initiallyShown={!profile?.welcome_shown} />
    </div>
  )
}
