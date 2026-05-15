import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isPastDeadline, timeUntilDeadline } from '@/lib/config'
import SignOutButton from '@/components/SignOutButton'
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

// ─── Status row ───────────────────────────────────────────────────────────────

function StatusRow({
  label,
  current,
  total,
  dimmed,
}: {
  label: string
  current: number
  total: number
  dimmed?: boolean
}) {
  const complete = current === total
  return (
    <div className={`flex items-center gap-3 py-2.5 ${dimmed ? 'opacity-40' : ''}`}>
      <span className="text-sm shrink-0">
        {complete ? '✅' : '⚠️'}
      </span>
      <span className="text-sm text-gray-300 flex-1">{label}</span>
      <span className={`text-sm font-mono tabular-nums ${complete ? 'text-green-400' : 'text-yellow-400'}`}>
        {current} / {total}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = data as Profile | null

  // Fetch prediction counts + leagues in parallel
  const [
    { count: groupCount },
    { count: knockoutCount },
    { data: awardRows },
    { data: leagueMemberships },
  ] = await Promise.all([
    supabase
      .from('group_predictions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('knockout_predictions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('award_predictions')
      .select('*')
      .eq('user_id', user.id)
      .limit(1),
    supabase
      .from('league_memberships')
      .select('league_id, league:leagues(id, name)')
      .eq('user_id', user.id),
  ])

  type LeagueRef = { id: number; name: string }
  const userLeagues = ((leagueMemberships ?? []) as unknown as { league: LeagueRef | null }[])
    .map(m => m.league)
    .filter((l): l is LeagueRef => l !== null)

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

  // Determine the primary CTA
  let ctaHref: string
  let ctaLabel: string
  if (!groupComplete) {
    ctaHref = '/predictions'
    ctaLabel = locked ? 'View Group Predictions' : 'Continue Group Stage Predictions →'
  } else if (!knockoutComplete) {
    ctaHref = '/predictions/knockout'
    ctaLabel = locked ? 'View Knockout Bracket' : 'Continue Knockout Bracket →'
  } else if (!awardsComplete) {
    ctaHref = '/predictions/awards'
    ctaLabel = locked ? 'View Awards' : 'Finish Awards Predictions →'
  } else {
    ctaHref = '/predictions/summary'
    ctaLabel = 'View My Predictions Summary →'
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Welcome, {profile?.display_name ?? user.email}!
          </h1>
          <p className="text-gray-500 text-sm">{user.email}</p>
        </div>

        {/* Deadline / countdown */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-4 mb-5">
          {locked ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-red-900/60 border border-red-700 px-2.5 py-0.5 text-red-300 text-xs font-semibold uppercase tracking-wide">
                Locked
              </span>
              <span className="text-gray-400 text-sm">Prediction deadline has passed.</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Deadline closes in</span>
              <span className="font-semibold text-white tabular-nums">
                {countdown.days}d {countdown.hours}h {countdown.minutes}m
              </span>
            </div>
          )}
        </div>

        {/* Predictions status panel */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-1 mb-5 divide-y divide-gray-800">
          <StatusRow
            label="Group Stage Predictions"
            current={groupPreds}
            total={72}
          />
          <StatusRow
            label="Knockout Bracket"
            current={knockoutPreds}
            total={32}
            dimmed={!groupComplete}
          />
          <StatusRow
            label="Tournament Awards"
            current={awardsCount}
            total={5}
            dimmed={!knockoutComplete}
          />
        </div>

        {/* Primary CTA */}
        <Link
          href={ctaHref}
          className={`block w-full text-center rounded-xl px-4 py-3.5 font-semibold text-base transition-colors mb-5 ${
            allComplete
              ? 'bg-green-700 hover:bg-green-600 text-white'
              : locked
              ? 'bg-gray-800 text-gray-400'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {ctaLabel}
        </Link>

        {/* Quick links for other sections */}
        {!allComplete && (
          <div className="flex flex-wrap gap-2 justify-center mb-6 text-xs">
            <Link href="/predictions" className="text-gray-500 hover:text-gray-300 transition-colors">
              Group Stage
            </Link>
            <span className="text-gray-700">·</span>
            <Link href="/predictions/review" className="text-gray-500 hover:text-gray-300 transition-colors">
              Standings Review
            </Link>
            <span className="text-gray-700">·</span>
            <Link href="/predictions/knockout" className="text-gray-500 hover:text-gray-300 transition-colors">
              Knockout Bracket
            </Link>
            <span className="text-gray-700">·</span>
            <Link href="/predictions/awards" className="text-gray-500 hover:text-gray-300 transition-colors">
              Awards
            </Link>
          </div>
        )}

        {/* Leaderboard */}
        <Link
          href="/leaderboard"
          className="block w-full text-center rounded-xl px-4 py-3.5 font-semibold text-base transition-colors mb-5 bg-gray-900 border border-gray-800 hover:border-gray-600 text-gray-300 hover:text-white"
        >
          Global Leaderboard →
        </Link>

        {/* Leagues section */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-gray-300">My Leagues</h2>
            {userLeagues.length > 0 && (
              <Link href="/leagues" className="text-xs text-blue-400 hover:underline">
                Manage →
              </Link>
            )}
          </div>

          {userLeagues.length === 0 ? (
            <Link
              href="/leagues"
              className="block w-full text-center rounded-lg border border-gray-700 hover:border-gray-500 px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Create or Join a League →
            </Link>
          ) : (
            <div className="space-y-1.5">
              {userLeagues.map(l => (
                <Link
                  key={l.id}
                  href={`/leagues/${l.id}`}
                  className="flex items-center justify-between rounded-lg bg-gray-800/50 hover:bg-gray-800 px-3 py-2 transition-colors"
                >
                  <span className="text-sm text-gray-200">{l.name}</span>
                  <span className="text-xs text-gray-500">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Admin panel link */}
        {profile?.is_admin && (
          <Link
            href="/admin"
            className="block w-full text-center rounded-xl px-4 py-3.5 font-semibold text-base transition-colors mb-5 bg-amber-700 hover:bg-amber-600 text-white"
          >
            Admin: Manage Match Results →
          </Link>
        )}

        <div className="flex justify-center">
          <SignOutButton />
        </div>
      </div>
    </main>
  )
}
