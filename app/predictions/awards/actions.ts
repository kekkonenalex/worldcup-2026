'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { revalidateLeaderboard, revalidatePredictions } from '@/lib/cache'
import { createClient } from '@/lib/supabase/server'
import { isPastDeadline } from '@/lib/config'

type SaveResult = { success: true } | { success: false; error: string }

const saveAwardsSchema = z.object({
  goldenBootPlayer: z.string().max(80).optional(),
  goldenBootGoals: z.number().int().min(1).max(20).nullable().optional(),
  goldenBallPlayer: z.string().max(80).optional(),
  goldenGlovePlayer: z.string().max(80).optional(),
  bestYoungPlayer: z.string().max(80).optional(),
})

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

  // 3. Validate
  const parsed = saveAwardsSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input.' }
  const data = parsed.data

  // 4. Sanitize string inputs: trim, cap at 80 chars, empty → null
  const sanitize = (s?: string): string | null => {
    if (!s) return null
    const trimmed = s.trim().slice(0, 80)
    return trimmed || null
  }

  // 5. Validate golden_boot_goals: integer 1–20 or null (Zod already checked, keep goals var for upsert)
  let goals: number | null = null
  if (data.goldenBootGoals != null) {
    goals = data.goldenBootGoals
  }

  // 5. Upsert
  const { error } = await supabase
    .from('award_predictions')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(
      {
        user_id: user.id,
        golden_boot_player: sanitize(data.goldenBootPlayer),
        golden_boot_goals: goals,
        golden_ball_player: sanitize(data.goldenBallPlayer),
        golden_glove_player: sanitize(data.goldenGlovePlayer),
        best_young_player: sanitize(data.bestYoungPlayer),
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'user_id' }
    )

  if (error) return { success: false, error: error.message }

  revalidatePath('/predictions/awards')
  revalidatePath('/predictions/summary')
  revalidatePredictions(user.id)
  revalidateLeaderboard()
  return { success: true }
}
