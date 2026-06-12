import type { SupabaseClient } from '@supabase/supabase-js'
import { isPastDeadline } from '@/lib/config'

export type AccessReason = 'self' | 'past_deadline' | 'pre_deadline' | 'not_in_shared_league'

export async function canViewPredictions(params: {
  viewerId: string
  targetUserId: string
  supabase: SupabaseClient
}): Promise<{ allowed: boolean; reason?: AccessReason }> {
  const { viewerId, targetUserId } = params

  // Your own predictions are always visible. Everyone else's become public once
  // the deadline passes — no shared-league requirement, so you can follow the
  // picks of anyone on the leaderboard.
  if (viewerId === targetUserId) return { allowed: true, reason: 'self' }
  if (!isPastDeadline()) return { allowed: false, reason: 'pre_deadline' }
  return { allowed: true, reason: 'past_deadline' }
}
