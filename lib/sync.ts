// Server-only: syncs football-data.org match data into Supabase.

import { createClient } from '@/lib/supabase/server'
import { fetchWorldCupMatches, classifyStage } from '@/lib/football-data'
import { recomputeBracketCascade } from '@/lib/results'
import type { MatchStage, MatchStatus } from '@/types/database'

// Known name variations from football-data.org → our teams table names.
const TEAM_ALIASES: Record<string, string> = {
  'United States': 'USA',
  'USA': 'USA',
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'IR Iran': 'Iran',
  'Iran (Islamic Republic of)': 'Iran',
  'Türkiye': 'Turkey',
  'Turkiye': 'Turkey',
  'Czech Republic': 'Czechia',
}

export function normalizeTeamName(s: string | null | undefined): string {
  if (!s) return '';
  // rest of existing logic...
}

// Decompose diacritics and strip combining characters, then normalize aliases.
export function normalizeTeamNameNFD(name: string): string {
  const decomposed = name.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return normalizeTeamName(decomposed)
}

function fdStatusToInternal(status: string): MatchStatus {
  if (status === 'FINISHED' || status === 'AWARDED') return 'finished'
  if (status === 'IN_PLAY' || status === 'PAUSED') return 'live'
  return 'scheduled'
}

function stageToInternal(fdStage: string, fdGroup: string | null): { stage: MatchStage; group_letter: string | null } {
  const classified = classifyStage(fdStage)
  switch (classified) {
    case 'group':
      return { stage: 'group', group_letter: fdGroup?.replace('GROUP_', '') ?? null }
    case 'r32':   return { stage: 'r32', group_letter: null }
    case 'r16':   return { stage: 'r16', group_letter: null }
    case 'qf':    return { stage: 'qf', group_letter: null }
    case 'sf':    return { stage: 'sf', group_letter: null }
    case 'third': return { stage: 'third_place', group_letter: null }
    case 'final': return { stage: 'final', group_letter: null }
    default:      return { stage: 'group', group_letter: null }
  }
}

export interface SyncResult {
  bootstrapped?: number
  updated: number
  errors: string[]
}

/**
 * One-time bootstrap: links our matches rows to external_id via team name matching.
 * Only updates rows where external_id IS NULL.
 */
export async function bootstrapExternalIds(apiKey: string): Promise<SyncResult> {
  const supabase = await createClient()
  const fdMatches = await fetchWorldCupMatches(apiKey)

  const { data: ourMatchesRaw } = await supabase
    .from('matches')
    .select('id, stage, group_letter, home_team_id, away_team_id, external_id, scheduled_at')
    .is('external_id', null)

  const { data: teamsRaw } = await supabase
    .from('teams')
    .select('id, name')

  type OurMatch = { id: number; stage: string; group_letter: string | null; home_team_id: number | null; away_team_id: number | null; external_id: number | null; scheduled_at: string | null }
  type OurTeam = { id: number; name: string }

  const ourMatches = (ourMatchesRaw ?? []) as unknown as OurMatch[]
  const teams = (teamsRaw ?? []) as unknown as OurTeam[]

  const teamNameToId = new Map<string, number>()
  for (const t of teams) {
    teamNameToId.set(t.name.toLowerCase(), t.id)
    teamNameToId.set(normalizeTeamNameNFD(t.name).toLowerCase(), t.id)
  }

  // Build lookup: home_team_id + away_team_id → our match id
  const ourMatchByTeams = new Map<string, number>()
  for (const m of ourMatches) {
    if (m.home_team_id && m.away_team_id) {
      ourMatchByTeams.set(`${m.home_team_id}:${m.away_team_id}`, m.id)
    }
  }

  let bootstrapped = 0
  const errors: string[] = []

  for (const fdm of fdMatches) {
    const classified = classifyStage(fdm.stage)
    if (classified === 'unknown') continue

    const homeNorm = normalizeTeamNameNFD(fdm.homeTeam.name).toLowerCase()
    const awayNorm = normalizeTeamNameNFD(fdm.awayTeam.name).toLowerCase()

    const homeId = teamNameToId.get(homeNorm) ?? teamNameToId.get(fdm.homeTeam.name.toLowerCase())
    const awayId = teamNameToId.get(awayNorm) ?? teamNameToId.get(fdm.awayTeam.name.toLowerCase())

    if (!homeId || !awayId) {
      // Knockout teams may not be known yet — skip silently
      continue
    }

    const ourMatchId = ourMatchByTeams.get(`${homeId}:${awayId}`)
    if (!ourMatchId) {
      // Try away:home (shouldn't be needed but safe)
      const reversed = ourMatchByTeams.get(`${awayId}:${homeId}`)
      if (!reversed) continue
    }

    const matchId = ourMatchByTeams.get(`${homeId}:${awayId}`) ?? ourMatchByTeams.get(`${awayId}:${homeId}`)
    if (!matchId) continue

    const { error } = await supabase
      .from('matches')
      .update({ external_id: fdm.id } as never)
      .eq('id', matchId)
      .is('external_id', null)

    if (error) {
      errors.push(`match ${matchId}: ${error.message}`)
    } else {
      bootstrapped++
    }
  }

  return { bootstrapped, updated: 0, errors }
}

/**
 * Idempotent sync: updates scores/status for all finished matches with an external_id.
 * Calls recomputeBracketCascade if any knockout results changed.
 */
export async function syncMatchResults(apiKey: string): Promise<SyncResult> {
  const supabase = await createClient()
  const fdMatches = await fetchWorldCupMatches(apiKey)

  const fdById = new Map(fdMatches.map(m => [m.id, m]))

  // Fetch our matches that have external_id set
  const { data: ourMatchesRaw } = await supabase
    .from('matches')
    .select('id, stage, external_id, home_score, away_score, status, winner_team_id, home_team_id, away_team_id')
    .not('external_id', 'is', null)

  type OurMatch = {
    id: number
    stage: string
    external_id: number
    home_score: number | null
    away_score: number | null
    status: string
    winner_team_id: number | null
    home_team_id: number | null
    away_team_id: number | null
  }
  const ourMatches = (ourMatchesRaw ?? []) as unknown as OurMatch[]

  let updated = 0
  let knockoutChanged = false
  const errors: string[] = []

  for (const m of ourMatches) {
    const fd = fdById.get(m.external_id)
    if (!fd) continue

    const newStatus = fdStatusToInternal(fd.status)
    const newHome = fd.score.fullTime.home
    const newAway = fd.score.fullTime.away

    // Skip if nothing changed
    if (
      m.status === newStatus &&
      m.home_score === newHome &&
      m.away_score === newAway
    ) continue

    // For finished group matches, we only need scores + status
    // For finished knockout matches, also set winner_team_id
    let winnerTeamId: number | null = m.winner_team_id

    if (newStatus === 'finished' && m.stage !== 'group' && newHome !== null && newAway !== null) {
      if (fd.score.winner === 'HOME_TEAM') {
        winnerTeamId = m.home_team_id
      } else if (fd.score.winner === 'AWAY_TEAM') {
        winnerTeamId = m.away_team_id
      }
    }

    const patch: Record<string, unknown> = {
      status: newStatus,
      home_score: newHome,
      away_score: newAway,
    }
    if (m.stage !== 'group') {
      patch.winner_team_id = winnerTeamId
    }

    const { error } = await supabase
      .from('matches')
      .update(patch as never)
      .eq('id', m.id)

    if (error) {
      errors.push(`match ${m.id}: ${error.message}`)
    } else {
      updated++
      if (m.stage !== 'group' && newStatus === 'finished') {
        knockoutChanged = true
      }
    }
  }

  if (knockoutChanged) {
    try {
      await recomputeBracketCascade()
    } catch (err) {
      errors.push(`bracket recompute: ${String(err)}`)
    }
  }

  return { updated, errors }
}