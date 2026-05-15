// Supabase data-fetching glue for the scoring engine. Server-side only.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Match, GroupPrediction, KnockoutPrediction, AwardPrediction, Team } from '@/types/database'
import {
  computeUserScore,
  rankUsers,
  type UserScoreBreakdown,
  type AwardResult,
} from '@/lib/scoring'

export type { AwardResult }

export async function fetchAllScoringData(supabase: SupabaseClient): Promise<{
  users: { id: string; display_name: string }[]
  groupMatches: Match[]
  knockoutMatches: Match[]
  groupPredictionsByUser: Map<string, GroupPrediction[]>
  knockoutPredictionsByUser: Map<string, KnockoutPrediction[]>
  awardPredictionByUser: Map<string, AwardPrediction | null>
  awardResult: AwardResult | null
  teams: Team[]
}> {
  const [
    { data: rawProfiles },
    { data: rawMatches },
    { data: rawGroupPreds },
    { data: rawKnockoutPreds },
    { data: rawAwardPreds },
    { data: rawAwardResult },
    { data: rawTeams },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name'),
    supabase.from('matches').select('*').order('match_number', { ascending: true }),
    supabase.from('group_predictions').select('*'),
    supabase.from('knockout_predictions').select('*'),
    supabase.from('award_predictions').select('*'),
    supabase.from('award_results').select('*').limit(1),
    supabase.from('teams').select('*'),
  ])

  const allMatches = (rawMatches ?? []) as unknown as Match[]
  const groupPreds = (rawGroupPreds ?? []) as unknown as GroupPrediction[]
  const knockoutPreds = (rawKnockoutPreds ?? []) as unknown as KnockoutPrediction[]
  const awardPreds = (rawAwardPreds ?? []) as unknown as AwardPrediction[]

  const groupPredictionsByUser = new Map<string, GroupPrediction[]>()
  for (const p of groupPreds) {
    const uid = p.user_id
    if (!groupPredictionsByUser.has(uid)) groupPredictionsByUser.set(uid, [])
    groupPredictionsByUser.get(uid)!.push(p)
  }

  const knockoutPredictionsByUser = new Map<string, KnockoutPrediction[]>()
  for (const p of knockoutPreds) {
    const uid = p.user_id
    if (!knockoutPredictionsByUser.has(uid)) knockoutPredictionsByUser.set(uid, [])
    knockoutPredictionsByUser.get(uid)!.push(p)
  }

  const awardPredictionByUser = new Map<string, AwardPrediction | null>()
  for (const p of awardPreds) awardPredictionByUser.set(p.user_id, p)

  return {
    users: (rawProfiles ?? []) as unknown as { id: string; display_name: string }[],
    groupMatches: allMatches.filter(m => m.match_number <= 72),
    knockoutMatches: allMatches.filter(m => m.match_number >= 73),
    groupPredictionsByUser,
    knockoutPredictionsByUser,
    awardPredictionByUser,
    awardResult: (rawAwardResult?.[0] ?? null) as unknown as AwardResult | null,
    teams: (rawTeams ?? []) as unknown as Team[],
  }
}

export async function getAllUserScores(
  supabase: SupabaseClient,
): Promise<
  Array<{ userId: string; displayName: string; breakdown: UserScoreBreakdown; rank: number }>
> {
  const data = await fetchAllScoringData(supabase)

  const scores = data.users.map(user => ({
    userId: user.id,
    breakdown: computeUserScore({
      userId: user.id,
      groupPredictions: data.groupPredictionsByUser.get(user.id) ?? [],
      groupMatches: data.groupMatches,
      knockoutPredictions: data.knockoutPredictionsByUser.get(user.id) ?? [],
      knockoutMatches: data.knockoutMatches,
      awardPrediction: data.awardPredictionByUser.get(user.id) ?? null,
      awardResult: data.awardResult,
      teams: data.teams,
    }),
  }))

  const displayNameById = new Map(data.users.map(u => [u.id, u.display_name]))
  return rankUsers(scores).map(r => ({
    ...r,
    displayName: displayNameById.get(r.userId) ?? r.userId,
  }))
}
