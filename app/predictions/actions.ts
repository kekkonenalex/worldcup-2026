'use server'

import { createClient } from '@/lib/supabase/server'
import { isPastDeadline, MAX_GOALS_PER_TEAM } from '@/lib/config'

type SaveResult = { success: true } | { success: false; error: string }

export async function savePrediction(
  matchId: number,
  homeScore: number,
  awayScore: number
): Promise<SaveResult> {
  if (isPastDeadline()) {
    return { success: false, error: 'Prediction deadline has passed' }
  }

  if (
    !Number.isInteger(matchId) || matchId <= 0 ||
    !Number.isInteger(homeScore) || homeScore < 0 || homeScore > MAX_GOALS_PER_TEAM ||
    !Number.isInteger(awayScore) || awayScore < 0 || awayScore > MAX_GOALS_PER_TEAM
  ) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, stage')
    .eq('id', matchId)
    .eq('stage', 'group')
    .single()

  if (matchError || !match) {
    return { success: false, error: 'Match not found or not a group stage match' }
  }

  const { error } = await supabase.from('group_predictions').upsert(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {
      user_id: user.id,
      match_id: matchId,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      updated_at: new Date().toISOString(),
    } as any,
    { onConflict: 'user_id,match_id' }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
