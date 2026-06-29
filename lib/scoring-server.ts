// Supabase data-fetching glue for the scoring engine. Server-side only.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Match, GroupPrediction, KnockoutPrediction, AwardPrediction, Team } from '@/types/database'
import {
  computeUserScore,
  rankUsers,
  type UserScoreBreakdown,
  type AwardResult,
} from '@/lib/scoring'
import { computeQualifiedTeams } from '@/lib/knockout-qualification'

export type { AwardResult }

// PostgREST caps a single .select() at 1000 rows. Tables that scale with
// users × matches (group_predictions ≈ users×72, knockout ≈ users×32) blow past
// that, so we must page through every row — otherwise predictions are silently
// dropped and those users score 0.
async function selectAll(
  supabase: SupabaseClient,
  table: string,
  columns: string,
): Promise<unknown[]> {
  const pageSize = 1000
  const all: unknown[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`selectAll(${table}): ${error.message}`)
    const batch = data ?? []
    all.push(...batch)
    if (batch.length < pageSize) break
  }
  return all
}

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
    rawProfiles,
    { data: rawMatches },
    rawGroupPreds,
    rawKnockoutPreds,
    rawAwardPreds,
    { data: rawAwardResult },
    { data: rawTeams },
  ] = await Promise.all([
    // Paginated: these scale with user count and exceed PostgREST's 1000-row cap.
    selectAll(supabase, 'profiles', 'id, display_name'),
    supabase.from('matches').select('*').order('match_number', { ascending: true }),
    selectAll(supabase, 'group_predictions', '*'),
    selectAll(supabase, 'knockout_predictions', '*'),
    selectAll(supabase, 'award_predictions', '*'),
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

  // Compute the actual R32 qualifiers ONCE (shared across all users). Returns
  // isComplete=false until every group match is finished — R32 points stay pending.
  const qualified = computeQualifiedTeams(data.groupMatches, data.teams)
  for (const w of qualified.warnings) console.warn(`[knockout-qualification] ${w}`)
  const actualR32Qualified = qualified.isComplete ? new Set(qualified.allR32) : null

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
      actualR32Qualified,
    }),
  }))

  const displayNameById = new Map(data.users.map(u => [u.id, u.display_name]))
  return rankUsers(scores).map(r => ({
    ...r,
    displayName: displayNameById.get(r.userId) ?? r.userId,
  }))
}
