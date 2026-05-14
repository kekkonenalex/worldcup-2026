'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isPastDeadline } from '@/lib/config'

type SaveResult = { success: true } | { success: false; error: string }

export async function saveAwards(input: {
  goldenBootPlayer?: string
  goldenBootGoals?: number | null
  goldenBallPlayer?: string
  goldenGlovePlayer?: string
  bestYoungPlayer?: string
}): Promise<SaveResult> {
  // 1. Authenticate
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // 2. Deadline check
  if (isPastDeadline()) {
    return { success: false, error: 'Prediction deadline has passed.' }
  }

  // 3. Sanitize string inputs: trim, cap at 80 chars, empty → null
  const sanitize = (s?: string): string | null => {
    if (!s) return null
    const trimmed = s.trim().slice(0, 80)
    return trimmed || null
  }

  // 4. Validate golden_boot_goals: integer 1–20 or null
  let goals: number | null = null
  if (input.goldenBootGoals != null) {
    const g = Number(input.goldenBootGoals)
    if (!Number.isInteger(g) || g < 1 || g > 20) {
      return { success: false, error: 'Goal count must be a whole number between 1 and 20.' }
    }
    goals = g
  }

  // 5. Upsert
  const { error } = await supabase
    .from('award_predictions')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(
      {
        user_id: user.id,
        golden_boot_player: sanitize(input.goldenBootPlayer),
        golden_boot_goals: goals,
        golden_ball_player: sanitize(input.goldenBallPlayer),
        golden_glove_player: sanitize(input.goldenGlovePlayer),
        best_young_player: sanitize(input.bestYoungPlayer),
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'user_id' }
    )

  if (error) return { success: false, error: error.message }

  revalidatePath('/predictions/awards')
  revalidatePath('/predictions/summary')
  return { success: true }
}
