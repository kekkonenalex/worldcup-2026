import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAllUserScores } from '@/lib/scoring-server'
import { isPastDeadline } from '@/lib/config'
import LeaderboardTable, { type LeaderboardBreakdown, type LeaderboardRow } from '@/components/leaderboard/LeaderboardTable'
import type { UserScoreBreakdown } from '@/lib/scoring'

export const dynamic = 'force-dynamic'

function toLeaderboardBreakdown(b: UserScoreBreakdown): LeaderboardBreakdown {
  return {
    groupTotal: b.groupTotal,
    knockoutTotal: b.knockoutTotal,
    topFourBonus: b.topFourBonus,
    awardsTotal: b.awardsTotal,
    awardsBreakdown: b.awardsBreakdown,
    total: b.total,
    tiebreakers: b.tiebreakers,
  }
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const scores = await getAllUserScores(supabase)
  const locked = isPastDeadline()

  const rows: LeaderboardRow[] = scores.map(s => ({
    userId: s.userId,
    displayName: s.displayName,
    rank: s.rank,
    breakdown: toLeaderboardBreakdown(s.breakdown),
  }))

  const hasResults = scores.some(s => s.breakdown.total > 0)
  const subtitle = !locked
    ? 'Predictions still open — final scores will be calculated after the deadline.'
    : hasResults
    ? 'Tournament in progress — scores update as match results are entered.'
    : 'Deadline has passed — scores will appear once match results are entered.'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-4 pt-8 pb-4 max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm">
          ← Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">Global Leaderboard</h1>
        <p className="text-gray-400 mt-1 text-sm">{subtitle}</p>
      </header>

      <div className="max-w-3xl mx-auto px-4 pb-16">
        <LeaderboardTable
          rows={rows}
          emptyMessage="No participants yet."
        />
      </div>
    </div>
  )
}
