import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isPastDeadline } from '@/lib/config'
import LeagueDetail from '@/components/LeagueDetail'
import { LeaderboardRow } from '@/components/ui/LeaderboardRow'
import { getAllUserScores } from '@/lib/scoring-server'
import { rankUsers, type UserScoreBreakdown } from '@/lib/scoring'
import type { AwardPrediction } from '@/types/database'

function toTotal(b: UserScoreBreakdown) { return b.total }

export type MemberInfo = {
  user_id: string
  display_name: string
  group_count: number
  knockout_count: number
  awards_count: number
}

function countAwards(award: AwardPrediction | null): number {
  if (!award) return 0
  return [award.golden_boot_player?.trim() || '', award.golden_boot_goals != null ? '1' : '', award.golden_ball_player?.trim() || '', award.golden_glove_player?.trim() || '', award.best_young_player?.trim() || ''].filter(Boolean).length
}

export default async function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const leagueId = parseInt(id, 10)
  if (isNaN(leagueId)) redirect('/leagues')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase.from('league_memberships').select('id').eq('league_id', leagueId).eq('user_id', user.id).limit(1)
  if (!membership || (membership as unknown[]).length === 0) redirect('/leagues?error=not-a-member')

  const { data: leagueRows } = await supabase.from('leagues').select('id, name, invite_code, created_by, created_at').eq('id', leagueId).limit(1)
  type LeagueRow = { id: number; name: string; invite_code: string; created_by: string; created_at: string }
  const league = (leagueRows as unknown as LeagueRow[] | null)?.[0]
  if (!league) redirect('/leagues')

  const { data: memberRows } = await supabase.from('league_memberships').select('user_id').eq('league_id', leagueId)
  const memberIds = ((memberRows as unknown as { user_id: string }[]) ?? []).map(m => m.user_id)

  const { data: profileRows } = await supabase.from('profiles').select('id, display_name').in('id', memberIds)
  type ProfileRow = { id: string; display_name: string }
  const profileMap = new Map<string, string>()
  for (const p of (profileRows as unknown as ProfileRow[]) ?? []) profileMap.set(p.id, p.display_name)

  const [{ data: groupPredRows }, { data: koPredRows }, { data: awardRows }, allScores] = await Promise.all([
    supabase.from('group_predictions').select('user_id').in('user_id', memberIds),
    supabase.from('knockout_predictions').select('user_id').in('user_id', memberIds),
    supabase.from('award_predictions').select('*').in('user_id', memberIds),
    getAllUserScores(supabase),
  ])

  const groupCountMap = new Map<string, number>()
  for (const p of (groupPredRows as unknown as { user_id: string }[]) ?? []) groupCountMap.set(p.user_id, (groupCountMap.get(p.user_id) ?? 0) + 1)

  const koCountMap = new Map<string, number>()
  for (const p of (koPredRows as unknown as { user_id: string }[]) ?? []) koCountMap.set(p.user_id, (koCountMap.get(p.user_id) ?? 0) + 1)

  const awardMap = new Map<string, AwardPrediction>()
  for (const a of (awardRows as unknown as AwardPrediction[]) ?? []) awardMap.set(a.user_id, a)

  const creatorName = profileMap.get(league.created_by) ?? 'Unknown'

  const members: MemberInfo[] = memberIds.map(uid => ({
    user_id: uid, display_name: profileMap.get(uid) ?? 'Unknown',
    group_count: groupCountMap.get(uid) ?? 0, knockout_count: koCountMap.get(uid) ?? 0,
    awards_count: countAwards(awardMap.get(uid) ?? null),
  }))
  members.sort((a, b) => { if (a.user_id === user.id) return -1; if (b.user_id === user.id) return 1; return a.display_name.localeCompare(b.display_name) })

  const memberIdSet = new Set(memberIds)
  const memberScores = allScores.filter(s => memberIdSet.has(s.userId)).map(s => ({ userId: s.userId, breakdown: s.breakdown }))
  const leagueRanked = rankUsers(memberScores)

  return (
    <div className="pb-16">
      <div className="mb-6">
        <Link href="/leagues" className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors">
          ← My Leagues
        </Link>
        <h1 className="text-4xl font-display tracking-wide uppercase text-fg-primary mt-3 mb-1">{league.name}</h1>
        <p className="text-fg-muted text-sm">Created by {creatorName}</p>
      </div>

      <LeagueDetail league={league} members={members} currentUserId={user.id} isPastDeadline={isPastDeadline()} />

      <div className="mt-8">
        <h2 className="text-2xl font-display tracking-wider uppercase text-fg-primary mb-1">League Standings</h2>
        <p className="text-fg-muted text-sm mb-4">
          {!isPastDeadline() ? 'Predictions still open — scores calculated after each matchday' : 'Scores calculated after each matchday'}
        </p>
        {leagueRanked.length === 0 ? (
          <p className="text-fg-muted text-sm">No scores yet — standings appear once match results are entered.</p>
        ) : (
          <div className="space-y-2">
            {leagueRanked.map(r => {
              const scoreEntry = allScores.find(s => s.userId === r.userId)
              const displayName = scoreEntry?.displayName ?? r.userId
              return (
                <LeaderboardRow
                  key={r.userId}
                  rank={r.rank}
                  isCurrentUser={r.userId === user.id}
                  displayName={displayName}
                  avatarInitials={(displayName[0] ?? '?').toUpperCase()}
                  points={toTotal(r.breakdown as UserScoreBreakdown)}
                  action={{ label: r.userId === user.id ? 'Edit Picks' : 'View Picks', href: `/users/${r.userId}` }}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
