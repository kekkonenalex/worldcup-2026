'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateInviteCode } from '@/lib/invite-code'

// ─── createLeague ─────────────────────────────────────────────────────────────

export async function createLeague(
  name: string
): Promise<{ success: boolean; leagueId?: number; inviteCode?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const trimmed = name.trim()
  if (trimmed.length < 3 || trimmed.length > 50) {
    return { success: false, error: 'League name must be between 3 and 50 characters.' }
  }

  // Insert with retry on invite code collision (up to 5 attempts)
  let leagueId: number | undefined
  let inviteCode: string | undefined

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode()
    const { data: league, error } = await supabase
      .from('leagues')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ name: trimmed, invite_code: code, created_by: user.id } as any)
      .select('id')
      .single()

    if (!error && league) {
      leagueId = (league as { id: number }).id
      inviteCode = code
      break
    }

    // If the error is NOT a unique constraint violation, give up immediately
    if (error && !error.message.toLowerCase().includes('unique') && !error.message.toLowerCase().includes('duplicate')) {
      return { success: false, error: error.message }
    }
  }

  if (!leagueId || !inviteCode) {
    return { success: false, error: 'Could not generate a unique invite code. Please try again.' }
  }

  // Add creator as first member
  const { error: memberError } = await supabase
    .from('league_memberships')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ league_id: leagueId, user_id: user.id } as any)

  if (memberError) {
    return { success: false, error: memberError.message }
  }

  revalidatePath('/leagues')
  return { success: true, leagueId, inviteCode }
}

// ─── joinLeague ───────────────────────────────────────────────────────────────

export async function joinLeague(
  inviteCode: string
): Promise<{ success: boolean; leagueId?: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const code = inviteCode.trim().toUpperCase()
  if (code.length !== 6) {
    return { success: false, error: 'Invite codes are 6 characters long.' }
  }

  // Look up the league
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id')
    .eq('invite_code', code)
    .limit(1)

  const league = (leagues as unknown as { id: number }[] | null)?.[0]
  if (!league) return { success: false, error: 'Invite code not found.' }

  const leagueId = league.id

  // Check if already a member
  const { data: existing } = await supabase
    .from('league_memberships')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .limit(1)

  if (existing && (existing as unknown[]).length > 0) {
    return { success: false, error: "You're already in this league.", leagueId }
  }

  // Insert membership
  const { error: memberError } = await supabase
    .from('league_memberships')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ league_id: leagueId, user_id: user.id } as any)

  if (memberError) return { success: false, error: memberError.message }

  revalidatePath('/leagues')
  return { success: true, leagueId }
}

// ─── leaveLeague ──────────────────────────────────────────────────────────────

export async function leaveLeague(
  leagueId: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Verify membership exists
  const { data: memRows } = await supabase
    .from('league_memberships')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .limit(1)

  if (!memRows || (memRows as unknown[]).length === 0) {
    return { success: false, error: "You're not a member of this league." }
  }

  // Prevent creator from leaving if sole member
  const { data: leagueRows } = await supabase
    .from('leagues')
    .select('created_by')
    .eq('id', leagueId)
    .limit(1)

  const createdBy = (leagueRows as unknown as { created_by: string }[] | null)?.[0]?.created_by

  if (createdBy === user.id) {
    const { count } = await supabase
      .from('league_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)

    if ((count ?? 0) <= 1) {
      return {
        success: false,
        error: "You created this league and are the only member. You can't leave — invite others first.",
      }
    }
  }

  const { error } = await supabase
    .from('league_memberships')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/leagues')
  revalidatePath(`/leagues/${leagueId}`)
  return { success: true }
}
