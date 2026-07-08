'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { recomputeBracketCascade } from '@/lib/results'
import { revalidateLeaderboard, revalidateMatches } from '@/lib/cache'
import { AWARD_WINNERS, normalizePlayerName, type AwardKey } from '@/lib/awards'

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

  revalidateLeaderboard()
  revalidateMatches()
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
  revalidateLeaderboard()
  revalidateMatches()
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

// ─── saveAwardWinner ──────────────────────────────────────────────────────────
//
// Records the actual (admin-entered) winner of an award into the award_results
// singleton row. Awards are scored live: every user whose normalized predicted
// name equals the winner's normalized name earns the award's points on next render.
// Uses the service-role client so it can (a) write award_results (no admin-write
// RLS policy needed) and (b) count matches across ALL users' award_predictions
// (which are otherwise RLS-restricted to the owner).

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service credentials not configured')
  return createServiceClient(url, key, { auth: { persistSession: false } })
}

// Merge a single field into the award_results singleton (id = 1), preserving the
// other awards' values.
async function patchAwardResults(
  db: ReturnType<typeof serviceClient>,
  field: string,
  value: unknown,
): Promise<string | null> {
  const { data: curRows } = await db.from('award_results').select('*').eq('id', 1).limit(1)
  const current = (curRows?.[0] ?? { id: 1 }) as Record<string, unknown>
  const patch: Record<string, unknown> = {
    ...current,
    id: 1,
    [field]: value,
    updated_at: new Date().toISOString(),
  }
  const { error } = await db.from('award_results').upsert(patch as never, { onConflict: 'id' })
  return error ? error.message : null
}

export async function saveAwardWinner(
  awardKey: AwardKey,
  winnerName: string,
): Promise<{ success: boolean; error?: string; matched?: number }> {
  const authErr = await assertAdmin()
  if (authErr) return { success: false, error: authErr }

  const cfg = AWARD_WINNERS.find(a => a.key === awardKey)
  if (!cfg) return { success: false, error: 'Unknown award' }

  const trimmed = winnerName.trim()
  const value = trimmed === '' ? null : trimmed

  const db = serviceClient()

  // Save only this award's name column — leaves the Golden Boot goal tally untouched.
  const err = await patchAwardResults(db, cfg.column, value)
  if (err) return { success: false, error: err }

  // Count how many users predicted this player (normalized match) — instant
  // feedback that the entered name actually matched people (catches typos).
  let matched = 0
  if (value != null) {
    const target = normalizePlayerName(value)
    const pageSize = 1000
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await db
        .from('award_predictions')
        .select(cfg.column)
        .range(from, from + pageSize - 1)
      if (error) break
      const rows = (data ?? []) as unknown as Array<Record<string, string | null>>
      for (const r of rows) {
        if (normalizePlayerName(r[cfg.column]) === target) matched++
      }
      if (rows.length < pageSize) break
    }
  }

  revalidateLeaderboard()
  revalidatePath('/admin')
  revalidatePath('/leaderboard')
  return { success: true, matched }
}

// ─── saveGoldenBootGoals ──────────────────────────────────────────────────────
//
// The Golden Boot goal tally is a separate scored item from the player name.
// Saved independently so the two never overwrite each other.
export async function saveGoldenBootGoals(
  goals: number | null,
): Promise<{ success: boolean; error?: string; matched?: number }> {
  const authErr = await assertAdmin()
  if (authErr) return { success: false, error: authErr }

  const value =
    goals != null && Number.isInteger(goals) && goals > 0 ? goals : null

  const db = serviceClient()
  const err = await patchAwardResults(db, 'golden_boot_goals', value)
  if (err) return { success: false, error: err }

  // Count how many users predicted this exact goal tally.
  let matched = 0
  if (value != null) {
    const pageSize = 1000
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await db
        .from('award_predictions')
        .select('golden_boot_goals')
        .range(from, from + pageSize - 1)
      if (error) break
      const rows = (data ?? []) as unknown as Array<{ golden_boot_goals: number | null }>
      for (const r of rows) {
        if (r.golden_boot_goals === value) matched++
      }
      if (rows.length < pageSize) break
    }
  }

  revalidateLeaderboard()
  revalidatePath('/admin')
  revalidatePath('/leaderboard')
  return { success: true, matched }
}
