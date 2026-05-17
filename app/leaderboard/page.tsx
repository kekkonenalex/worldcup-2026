import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAllUserScores } from '@/lib/scoring-server'
import { isPastDeadline } from '@/lib/config'
import { LeaderboardRow } from '@/components/ui/LeaderboardRow'
import type { UserScoreBreakdown } from '@/lib/scoring'

export const dynamic = 'force-dynamic'

const TOP_N = 10

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const scores = await getAllUserScores(supabase)
  const locked = isPastDeadline()

  const subtitle = !locked
    ? 'Predictions still open — scores calculated after each matchday'
    : 'Scores calculated after each matchday'

  const top = scores.slice(0, TOP_N)
  const myIndex = scores.findIndex(s => s.userId === user.id)
  const myEntry = myIndex >= TOP_N ? scores[myIndex] : null

  function rowProps(s: typeof scores[number]) {
    return {
      rank: s.rank,
      isCurrentUser: s.userId === user!.id,
      displayName: s.displayName,
      avatarInitials: (s.displayName[0] ?? '?').toUpperCase(),
      points: (s.breakdown as UserScoreBreakdown).total,
      action: { label: s.userId === user!.id ? 'Edit Picks' : 'View Picks', href: `/users/${s.userId}` },
    }
  }

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
          <>
            {top.map(s => (
              <LeaderboardRow key={s.userId} {...rowProps(s)} />
            ))}

            {myEntry && (
              <>
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-border-subtle" />
                  <span className="text-xs text-fg-muted tracking-wider">Your placement</span>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>
                <LeaderboardRow key={myEntry.userId} {...rowProps(myEntry)} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
