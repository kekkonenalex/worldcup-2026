import type { SupabaseClient } from '@supabase/supabase-js'
import { isPastDeadline } from '@/lib/config'

export type AccessReason = 'self' | 'past_deadline' | 'pre_deadline' | 'not_in_shared_league'

export async function canViewPredictions(params: {
  viewerId: string
  targetUserId: string
  supabase: SupabaseClient
}): Promise<{ allowed: boolean; reason?: AccessReason }> {
  const { viewerId, targetUserId, supabase } = params

  if (viewerId === targetUserId) return { allowed: true, reason: 'self' }
  if (!isPastDeadline()) return { allowed: false, reason: 'pre_deadline' }

  const { data: viewerMemberships } = await supabase
    .from('league_memberships')
    .select('league_id')
    .eq('user_id', viewerId)

  const viewerLeagueIds = ((viewerMemberships as unknown as { league_id: number }[]) ?? [])
    .map(m => m.league_id)

  if (viewerLeagueIds.length === 0) return { allowed: false, reason: 'not_in_shared_league' }

  const { data: shared } = await supabase
    .from('league_memberships')
    .select('id')
    .eq('user_id', targetUserId)
    .in('league_id', viewerLeagueIds)
    .limit(1)

  const hasSharedLeague = ((shared as unknown[]) ?? []).length > 0
  return hasSharedLeague
    ? { allowed: true, reason: 'past_deadline' }
    : { allowed: false, reason: 'not_in_shared_league' }
}
