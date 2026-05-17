import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAllUserScores } from '@/lib/scoring-server'
import { isPastDeadline } from '@/lib/config'
import { LeaderboardRow } from '@/components/ui/LeaderboardRow'
import type { UserScoreBreakdown } from '@/lib/scoring'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const scores = await getAllUserScores(supabase)
  const locked = isPastDeadline()

  const subtitle = !locked
    ? 'Predictions still open — scores calculated after each matchday'
    : 'Scores calculated after each matchday'

  return (
    <div className="pb-16">
      <div className="mb-8">
        <Link href="/" className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors">
          ← Home
        </Link>
        <h1 className="text-5xl font-display tracking-wide uppercase text-fg-primary mt-3 mb-2">
          Global Leaderboard
        </h1>
        <p className="text-fg-muted text-sm">{subtitle}</p>
      </div>

      <div className="max-w-3xl space-y-2">
        {scores.length === 0 ? (
          <p className="text-fg-muted text-sm text-center py-8">No participants yet.</p>
        ) : (
          scores.map(s => (
            <LeaderboardRow
              key={s.userId}
              rank={s.rank}
              isCurrentUser={s.userId === user.id}
              displayName={s.displayName}
              avatarInitials={(s.displayName[0] ?? '?').toUpperCase()}
              points={(s.breakdown as UserScoreBreakdown).total}
              action={{ label: s.userId === user.id ? 'Edit Picks' : 'View Picks', href: `/users/${s.userId}` }}
            />
          ))
        )}
      </div>
    </div>
  )
}
