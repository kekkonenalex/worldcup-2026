'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { revalidateLeaderboard, revalidatePredictions } from '@/lib/cache'
import { createClient } from '@/lib/supabase/server'
import {
  computeGroupStandings,
  rankThirdPlaceTeams,
  getAdvancingTeams,
  type MatchInput,
  type PredictionInput,
  type TeamInput,
  type TeamStanding,
} from '@/lib/simulation'
import {
  BRACKET_STRUCTURE,
  getDownstreamMatches,
  resolveBracket,
  type BracketContext,
} from '@/lib/bracket'
import { isPastDeadline } from '@/lib/config'
import type { MatchWithTeams, GroupPrediction, KnockoutPrediction } from '@/types/database'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

const saveKnockoutSchema = z.object({
  matchNumber: z.number().int().min(73).max(104),
  teamId: z.number().int().positive(),
})

type ActionResult =
  | { success: true; cleared_downstream: number[] }
  | { success: false; error: string }

export async function saveKnockoutPrediction(
  matchNumber: number,
  teamId: number
): Promise<ActionResult> {
  // 1. Authenticate
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // 2. Deadline check
  if (isPastDeadline()) {
    return { success: false, error: 'Predictions are locked — the tournament has started.' }
  }

  // 3. Validate inputs
  const parsed = saveKnockoutSchema.safeParse({ matchNumber, teamId })
  if (!parsed.success) return { success: false, error: 'Invalid input.' }

  // 4. Re-run group simulation to confirm teamId is among the 32 advancing teams
  const { data: rawMatches, error: matchError } = await supabase
    .from('matches')
    .select(`
      id, match_number, group_letter, home_team_id, away_team_id,
      home_team:teams!matches_home_team_id_fkey(id, name, short_code, group_letter, flag_emoji),
      away_team:teams!matches_away_team_id_fkey(id, name, short_code, group_letter, flag_emoji)
    `)
    .eq('stage', 'group')
    .order('match_number', { ascending: true })

  if (matchError || !rawMatches) {
    return { success: false, error: 'Failed to load group matches.' }
  }

  const matches = rawMatches as unknown as MatchWithTeams[]

  const { data: rawPreds } = await supabase
    .from('group_predictions')
    .select('*')
    .eq('user_id', user.id)

  const userGroupPreds = (rawPreds ?? []) as unknown as GroupPrediction[]
  if (userGroupPreds.length < 72) {
    return { success: false, error: 'Complete all 72 group stage predictions first.' }
  }

  const predictions: PredictionInput[] = userGroupPreds.map(p => ({
    match_id: p.match_id,
    predicted_home_score: p.predicted_home_score,
    predicted_away_score: p.predicted_away_score,
  }))

  // Build per-group structures
  const matchesByGroup = new Map<string, MatchInput[]>()
  const teamsByGroup = new Map<string, Map<number, TeamInput>>()

  for (const raw of matches) {
    const letter = raw.group_letter
    if (!letter) continue
    if (!matchesByGroup.has(letter)) matchesByGroup.set(letter, [])
    if (!teamsByGroup.has(letter)) teamsByGroup.set(letter, new Map())

    matchesByGroup.get(letter)!.push({
      id: raw.id,
      match_number: raw.match_number,
      group_letter: letter,
      home_team_id: raw.home_team_id!,
      away_team_id: raw.away_team_id!,
    })

    const tMap = teamsByGroup.get(letter)!
    if (raw.home_team && !tMap.has(raw.home_team.id))
      tMap.set(raw.home_team.id, { ...raw.home_team, group_letter: letter })
    if (raw.away_team && !tMap.has(raw.away_team.id))
      tMap.set(raw.away_team.id, { ...raw.away_team, group_letter: letter })
  }

  const allGroupStandings: TeamStanding[][] = []
  for (const letter of GROUP_LETTERS) {
    const groupMatches = matchesByGroup.get(letter)
    const groupTeams = teamsByGroup.get(letter)
    if (!groupMatches || !groupTeams) continue
    allGroupStandings.push(
      computeGroupStandings(letter, groupMatches, predictions, Array.from(groupTeams.values()))
    )
  }

  const thirdPlaceResult = rankThirdPlaceTeams(allGroupStandings)
  const advancingTeams = getAdvancingTeams(allGroupStandings, thirdPlaceResult)
  const advancingIds = new Set(advancingTeams.map(t => t.team_id))

  if (!advancingIds.has(teamId)) {
    return { success: false, error: 'That team did not advance to the Round of 32 per your group predictions.' }
  }

  // 5. Resolve the bracket with current knockout picks and verify teamId is valid for this match
  const { data: rawKoPreds } = await supabase
    .from('knockout_predictions')
    .select('*')
    .eq('user_id', user.id)

  const koPreds = (rawKoPreds ?? []) as unknown as KnockoutPrediction[]

  // Build userPicks from existing predictions (before this upsert)
  const existingPicks = new Map<number, number>()
  for (const p of koPreds) existingPicks.set(p.bracket_position, p.predicted_team_id)

  const ctx: BracketContext = {
    groupStandings: allGroupStandings,
    thirdPlaceResult,
    userPicks: existingPicks,
  }

  const resolved = resolveBracket(ctx)
  const targetMatch = resolved.find(m => m.match_number === matchNumber)

  if (!targetMatch) {
    return { success: false, error: 'Match not found in bracket.' }
  }

  if (
    targetMatch.team_a?.team_id !== teamId &&
    targetMatch.team_b?.team_id !== teamId
  ) {
    return { success: false, error: 'That team is not in this match per your current bracket.' }
  }

  // 6. Upsert the prediction
  // bracket_position stores match_number (73-104), not 1-32
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upsertError } = await supabase
    .from('knockout_predictions')
    .upsert(
      { user_id: user.id, bracket_position: matchNumber, predicted_team_id: teamId } as any,
      { onConflict: 'user_id,bracket_position' }
    )

  if (upsertError) {
    return { success: false, error: `Failed to save prediction: ${upsertError.message}` }
  }

  // 7. Clear downstream picks that are now potentially invalid
  const downstream = getDownstreamMatches(matchNumber)
  if (downstream.length > 0) {
    await supabase
      .from('knockout_predictions')
      .delete()
      .eq('user_id', user.id)
      .in('bracket_position', downstream)
  }

  // 8. Revalidate
  revalidatePath('/predictions/knockout')
  revalidatePredictions(user.id)
  revalidateLeaderboard()

  return { success: true, cleared_downstream: downstream }
}
