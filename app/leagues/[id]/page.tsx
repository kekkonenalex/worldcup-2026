import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isPastDeadline } from '@/lib/config'
import LeagueDetail from '@/components/LeagueDetail'
import type { AwardPrediction } from '@/types/database'

export type MemberInfo = {
  user_id: string
  display_name: string
  group_count: number
  knockout_count: number
  awards_count: number
}

function countAwards(award: AwardPrediction | null): number {
  if (!award) return 0
  return [
    award.golden_boot_player?.trim() || '',
    award.golden_boot_goals != null ? '1' : '',
    award.golden_ball_player?.trim() || '',
    award.golden_glove_player?.trim() || '',
    award.best_young_player?.trim() || '',
  ].filter(Boolean).length
}

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const leagueId = parseInt(id, 10)
  if (isNaN(leagueId)) redirect('/leagues')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify the user is a member
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .limit(1)

  if (!membership || (membership as unknown[]).length === 0) {
    redirect('/leagues?error=not-a-member')
  }

  // Fetch the league row
  const { data: leagueRows } = await supabase
    .from('leagues')
    .select('id, name, invite_code, created_by, created_at')
    .eq('id', leagueId)
    .limit(1)

  type LeagueRow = { id: number; name: string; invite_code: string; created_by: string; created_at: string }
  const league = (leagueRows as unknown as LeagueRow[] | null)?.[0]
  if (!league) redirect('/leagues')

  // Fetch all members
  const { data: memberRows } = await supabase
    .from('league_memberships')
    .select('user_id')
    .eq('league_id', leagueId)

  const memberIds = ((memberRows as unknown as { user_id: string }[]) ?? []).map(m => m.user_id)

  // Fetch profiles
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', memberIds)

  type ProfileRow = { id: string; display_name: string }
  const profileMap = new Map<string, string>()
  for (const p of (profileRows as unknown as ProfileRow[]) ?? []) {
    profileMap.set(p.id, p.display_name)
  }

  // Fetch prediction data in parallel
  const [
    { data: groupPredRows },
    { data: koPredRows },
    { data: awardRows },
  ] = await Promise.all([
    supabase.from('group_predictions').select('user_id').in('user_id', memberIds),
    supabase.from('knockout_predictions').select('user_id').in('user_id', memberIds),
    supabase.from('award_predictions').select('*').in('user_id', memberIds),
  ])

  // Count group predictions per user
  const groupCountMap = new Map<string, number>()
  for (const p of (groupPredRows as unknown as { user_id: string }[]) ?? []) {
    groupCountMap.set(p.user_id, (groupCountMap.get(p.user_id) ?? 0) + 1)
  }

  // Count knockout predictions per user
  const koCountMap = new Map<string, number>()
  for (const p of (koPredRows as unknown as { user_id: string }[]) ?? []) {
    koCountMap.set(p.user_id, (koCountMap.get(p.user_id) ?? 0) + 1)
  }

  // Map award predictions per user
  const awardMap = new Map<string, AwardPrediction>()
  for (const a of (awardRows as unknown as AwardPrediction[]) ?? []) {
    awardMap.set(a.user_id, a)
  }

  // Fetch creator display name
  const creatorName = profileMap.get(league.created_by) ?? 'Unknown'

  const members: MemberInfo[] = memberIds.map(uid => ({
    user_id: uid,
    display_name: profileMap.get(uid) ?? 'Unknown',
    group_count: groupCountMap.get(uid) ?? 0,
    knockout_count: koCountMap.get(uid) ?? 0,
    awards_count: countAwards(awardMap.get(uid) ?? null),
  }))

  // Sort: current user first, then alphabetically
  members.sort((a, b) => {
    if (a.user_id === user.id) return -1
    if (b.user_id === user.id) return 1
    return a.display_name.localeCompare(b.display_name)
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-4 pt-8 pb-4 max-w-3xl mx-auto">
        <Link href="/leagues" className="text-gray-500 hover:text-gray-300 text-sm">
          ← My Leagues
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">{league.name}</h1>
        <p className="text-gray-400 mt-1 text-sm">Created by {creatorName}</p>
      </header>

      <LeagueDetail
        league={league}
        members={members}
        currentUserId={user.id}
        isPastDeadline={isPastDeadline()}
      />
    </div>
  )
}
