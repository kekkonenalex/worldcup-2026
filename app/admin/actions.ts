'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { recomputeBracketCascade } from '@/lib/results'

// ── Internal admin check (safe to use in server actions — no redirect thrown) ─

async function assertAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Not authenticated'

  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .limit(1)

  const isAdmin = (data as unknown as { is_admin: boolean }[] | null)?.[0]?.is_admin ?? false
  return isAdmin ? null : 'Not authorized'
}

// ─── saveGroupMatchResult ─────────────────────────────────────────────────────

export async function saveGroupMatchResult(
  matchId: number,
  homeScore: number | null,
  awayScore: number | null,
  status: 'scheduled' | 'live' | 'finished'
): Promise<{ success: boolean; error?: string }> {
  const authErr = await assertAdmin()
  if (authErr) return { success: false, error: authErr }

  if (homeScore !== null && (homeScore < 0 || homeScore > 20 || !Number.isInteger(homeScore))) {
    return { success: false, error: 'Score must be an integer 0–20' }
  }
  if (awayScore !== null && (awayScore < 0 || awayScore > 20 || !Number.isInteger(awayScore))) {
    return { success: false, error: 'Score must be an integer 0–20' }
  }
  if (!['scheduled', 'live', 'finished'].includes(status)) {
    return { success: false, error: 'Invalid status' }
  }

  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from('matches')
    .update({ home_score: homeScore, away_score: awayScore, status } as never)
    .eq('id', matchId)
    .select('id')

  if (error) return { success: false, error: error.message }
  if (!updated || updated.length === 0) {
    return { success: false, error: 'No rows updated — run the Phase 10 SQL migration and check admin RLS policy on matches' }
  }

  if (status === 'finished') {
    await recomputeBracketCascade()
  }

  revalidatePath('/admin')
  return { success: true }
}

// ─── saveKnockoutWinner ───────────────────────────────────────────────────────

export async function saveKnockoutWinner(
  matchId: number,
  winnerTeamId: number | null
): Promise<{ success: boolean; error?: string }> {
  const authErr = await assertAdmin()
  if (authErr) return { success: false, error: authErr }

  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('matches')
    .select('match_number, home_team_id, away_team_id')
    .eq('id', matchId)
    .limit(1)

  type MatchRow = { match_number: number; home_team_id: number | null; away_team_id: number | null }
  const match = (rows as unknown as MatchRow[] | null)?.[0]
  if (!match) return { success: false, error: 'Match not found' }
  if (match.match_number < 73 || match.match_number > 104) {
    return { success: false, error: 'Not a knockout match' }
  }
  if (
    winnerTeamId !== null &&
    winnerTeamId !== match.home_team_id &&
    winnerTeamId !== match.away_team_id
  ) {
    return { success: false, error: 'Winner must be one of the two teams in this match' }
  }

  const newStatus = winnerTeamId != null ? 'finished' : 'scheduled'

  const { data: updated, error } = await supabase
    .from('matches')
    .update({ winner_team_id: winnerTeamId, status: newStatus } as never)
    .eq('id', matchId)
    .select('id')

  if (error) return { success: false, error: error.message }
  if (!updated || updated.length === 0) {
    return { success: false, error: 'No rows updated — run the Phase 10 SQL migration and check admin RLS policy on matches' }
  }

  await recomputeBracketCascade()
  revalidatePath('/admin')
  return { success: true }
}

// ─── triggerBracketRecompute ──────────────────────────────────────────────────

export async function triggerBracketRecompute(): Promise<{ success: boolean; error?: string }> {
  const authErr = await assertAdmin()
  if (authErr) return { success: false, error: authErr }

  await recomputeBracketCascade()
  revalidatePath('/admin')
  return { success: true }
}
