// Server-only: syncs football-data.org match data into Supabase.

import { createClient } from '@/lib/supabase/server'
import { fetchWorldCupMatches, classifyStage } from '@/lib/football-data'
import {
  computeActualStandings,
  rankThirdPlaceTeams,
  type MatchInput,
  type TeamInput,
  type TeamStanding,
  type ThirdPlaceResult,
} from '@/lib/simulation'
import { BRACKET_STRUCTURE, assignThirdPlaceTeams, type FixedSource } from '@/lib/bracket'
import type { Match, MatchStage, MatchStatus } from '@/types/database'

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
  if (!s) return ''
  return TEAM_ALIASES[s] ?? s
}

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
  clearedKnockout: number
  groupUpdated: number
  groupCleared: number
  knockoutUpdated: number
  cascadeAssigned: number
  cascadeEmptied: number
  errors: string[]
  // legacy aliases so existing callers that read .updated still get a number
  updated: number
  cleared: number
}

/**
 * One-time bootstrap: links our matches rows to external_id via team name matching.
 */
export async function bootstrapExternalIds(apiKey: string): Promise<SyncResult> {
  const supabase = await createClient()
  const fdMatches = await fetchWorldCupMatches(apiKey)

  const { data: ourMatchesRaw } = await supabase
    .from('matches')
    .select('id, stage, group_letter, home_team_id, away_team_id, external_id, scheduled_at')
    .is('external_id', null)

  const { data: teamsRaw } = await supabase.from('teams').select('id, name')

  type OurMatch = { id: number; stage: string; group_letter: string | null; home_team_id: number | null; away_team_id: number | null; external_id: number | null; scheduled_at: string | null }
  type OurTeam = { id: number; name: string }

  const ourMatches = (ourMatchesRaw ?? []) as unknown as OurMatch[]
  const teams = (teamsRaw ?? []) as unknown as OurTeam[]

  const teamNameToId = new Map<string, number>()
  for (const t of teams) {
    teamNameToId.set(t.name.toLowerCase(), t.id)
    teamNameToId.set(normalizeTeamNameNFD(t.name).toLowerCase(), t.id)
  }

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
    if (!homeId || !awayId) continue

    const matchId = ourMatchByTeams.get(`${homeId}:${awayId}`) ?? ourMatchByTeams.get(`${awayId}:${homeId}`)
    if (!matchId) continue

    const { error } = await supabase
      .from('matches')
      .update({ external_id: fdm.id } as never)
      .eq('id', matchId)
      .is('external_id', null)

    if (error) errors.push(`match ${matchId}: ${error.message}`)
    else bootstrapped++
  }

  return { bootstrapped, updated: 0, cleared: 0, clearedKnockout: 0, groupUpdated: 0, groupCleared: 0, knockoutUpdated: 0, cascadeAssigned: 0, cascadeEmptied: 0, errors }
}

/**
 * Rebuilds home_team_id / away_team_id on all 32 knockout matches (73–104).
 * Explicitly nulls slots that can't be resolved. Idempotent.
 */
export async function rebuildKnockoutCascade(): Promise<{ assigned: number; emptied: number; errors: string[] }> {
  const supabase = await createClient()

  const [{ data: rawMatches }, { data: rawTeams }] = await Promise.all([
    supabase.from('matches').select('*').order('match_number', { ascending: true }),
    supabase.from('teams').select('*'),
  ])

  const matches = (rawMatches ?? []) as unknown as Match[]
  const teams = (rawTeams ?? []) as unknown as TeamInput[]

  const groupMatches = matches.filter(m => m.stage === 'group')
  const groupComplete =
    groupMatches.length === 72 &&
    groupMatches.every(m => m.home_score != null && m.away_score != null)

  type Entry = { id: number; home: number | null; away: number | null; winner: number | null }
  const matchMap = new Map<number, Entry>()
  for (const m of matches) {
    matchMap.set(m.match_number, { id: m.id, home: m.home_team_id, away: m.away_team_id, winner: m.winner_team_id })
  }

  const groupStandingsMap = new Map<string, TeamStanding[]>()
  let thirdPlaceResult: ThirdPlaceResult | null = null
  let thirdAssignment: Record<number, string> = {}

  if (groupComplete) {
    const teamsByGroup = new Map<string, TeamInput[]>()
    for (const t of teams) {
      if (!teamsByGroup.has(t.group_letter)) teamsByGroup.set(t.group_letter, [])
      teamsByGroup.get(t.group_letter)!.push(t)
    }

    const allGroupStandings: TeamStanding[][] = []
    for (const letter of 'ABCDEFGHIJKL'.split('')) {
      const gm = groupMatches.filter(m => m.group_letter === letter)
      const gt = teamsByGroup.get(letter) ?? []
      if (gt.length === 0) continue
      const results = gm.map(m => ({ match_id: m.id, home_score: m.home_score!, away_score: m.away_score! }))
      const matchInputs: MatchInput[] = gm.map(m => ({
        id: m.id, match_number: m.match_number, group_letter: letter,
        home_team_id: m.home_team_id!, away_team_id: m.away_team_id!,
      }))
      const standings = computeActualStandings(letter, matchInputs, results, gt)
      allGroupStandings.push(standings)
      groupStandingsMap.set(letter, standings)
    }

    try {
      thirdPlaceResult = rankThirdPlaceTeams(allGroupStandings)
      thirdAssignment = assignThirdPlaceTeams(thirdPlaceResult.advancing.map(t => t.group_letter))
    } catch {
      thirdPlaceResult = null
    }
  }

  const updates: Array<{ id: number; home_team_id: number | null; away_team_id: number | null }> = []
  let assigned = 0
  let emptied = 0
  const errors: string[] = []

  for (const def of BRACKET_STRUCTURE) {
    const entry = matchMap.get(def.match_number)
    if (!entry) continue

    let homeId: number | null = null
    let awayId: number | null = null

    if (def.stage === 'r32') {
      if (!groupComplete || !thirdPlaceResult) {
        homeId = null; awayId = null
      } else {
        const resolveGroupSlot = (slot: FixedSource): number | null => {
          if (slot.kind === 'group_winner')
            return groupStandingsMap.get(slot.group)?.find(s => s.position === 1)?.team_id ?? null
          if (slot.kind === 'group_runner_up')
            return groupStandingsMap.get(slot.group)?.find(s => s.position === 2)?.team_id ?? null
          if (slot.kind === 'third_place') {
            const assignedGroup = thirdAssignment[def.match_number]
            if (!assignedGroup) return null
            return thirdPlaceResult!.advancing.find(t => t.group_letter === assignedGroup)?.team_id ?? null
          }
          return null
        }
        homeId = resolveGroupSlot(def.slot_a)
        awayId = resolveGroupSlot(def.slot_b)
      }
    } else {
      const resolveKnockoutSlot = (slot: FixedSource): number | null => {
        if (slot.kind === 'winner_of') return matchMap.get(slot.match)?.winner ?? null
        if (slot.kind === 'loser_of') {
          const parent = matchMap.get(slot.match)
          if (!parent || parent.winner == null) return null
          if (parent.home === parent.winner) return parent.away
          if (parent.away === parent.winner) return parent.home
          return null
        }
        return null
      }
      const resolvedHome = resolveKnockoutSlot(def.slot_a)
      const resolvedAway = resolveKnockoutSlot(def.slot_b)
      if (resolvedHome != null && resolvedAway != null) {
        homeId = resolvedHome; awayId = resolvedAway
      }
    }

    matchMap.set(def.match_number, { ...entry, home: homeId, away: awayId })

    if (entry.home !== homeId || entry.away !== awayId) {
      updates.push({ id: entry.id, home_team_id: homeId, away_team_id: awayId })
      if (homeId != null || awayId != null) assigned++
      else emptied++
    }
  }

  for (const u of updates) {
    const { error } = await supabase
      .from('matches')
      .update({ home_team_id: u.home_team_id, away_team_id: u.away_team_id } as never)
      .eq('id', u.id)
    if (error) errors.push(`cascade match ${u.id}: ${error.message}`)
  }

  return { assigned, emptied, errors }
}

/**
 * Full sync:
 * 1. Unconditionally wipe all knockout match results (winner_team_id, scores).
 * 2. For group matches with external_id: write if FINISHED, clear otherwise.
 * 3. For knockout matches with external_id: write if FINISHED (clean slate from step 1).
 * 4. Rebuild knockout cascade (home_team_id / away_team_id) from current group results.
 */
export async function syncMatchResults(apiKey: string): Promise<SyncResult> {
  const supabase = await createClient()

  // ── Step 1: Wipe all knockout results unconditionally ────────────────────────
  const { data: wipedRows } = await supabase
    .from('matches')
    .update({ winner_team_id: null, home_score: null, away_score: null, status: 'scheduled' } as never)
    .neq('stage', 'group')
    .select('id')

  const clearedKnockout = (wipedRows ?? []).length

  // ── Steps 2 & 3: API sync ────────────────────────────────────────────────────
  const fdMatches = await fetchWorldCupMatches(apiKey)
  const fdById = new Map(fdMatches.map(m => [m.id, m]))

  const { data: ourMatchesRaw } = await supabase
    .from('matches')
    .select('id, stage, external_id, home_score, away_score, status, winner_team_id, home_team_id, away_team_id, scheduled_at')
    .not('external_id', 'is', null)

  type OurMatch = {
    id: number; stage: string; external_id: number
    home_score: number | null; away_score: number | null; status: string
    winner_team_id: number | null; home_team_id: number | null; away_team_id: number | null
    scheduled_at: string | null
  }
  const ourMatches = (ourMatchesRaw ?? []) as unknown as OurMatch[]

  let groupUpdated = 0
  let groupCleared = 0
  let knockoutUpdated = 0
  const errors: string[] = []

  for (const m of ourMatches) {
    const fd = fdById.get(m.external_id)
    if (!fd) continue

    const newStatus = fdStatusToInternal(fd.status)

    if (m.stage === 'group') {
      if (newStatus === 'finished') {
        const newHome = fd.score.fullTime.home
        const newAway = fd.score.fullTime.away
        if (m.status === newStatus && m.home_score === newHome && m.away_score === newAway && m.scheduled_at === fd.utcDate) continue
        const { error } = await supabase
          .from('matches')
          .update({ status: newStatus, home_score: newHome, away_score: newAway, scheduled_at: fd.utcDate } as never)
          .eq('id', m.id)
        if (error) errors.push(`group match ${m.id}: ${error.message}`)
        else groupUpdated++
      } else {
        const hasStale = m.home_score !== null || m.away_score !== null || m.status !== newStatus || m.scheduled_at !== fd.utcDate
        if (hasStale) {
          const { error } = await supabase
            .from('matches')
            .update({ status: newStatus, home_score: null, away_score: null, scheduled_at: fd.utcDate } as never)
            .eq('id', m.id)
          if (error) errors.push(`group match ${m.id} (clear): ${error.message}`)
          else groupCleared++
        }
      }
    } else {
      // Knockout: already wiped in step 1 — only write if FINISHED
      if (newStatus === 'finished') {
        const newHome = fd.score.fullTime.home
        const newAway = fd.score.fullTime.away
        let winnerTeamId: number | null = null
        if (fd.score.winner === 'HOME_TEAM') winnerTeamId = m.home_team_id
        else if (fd.score.winner === 'AWAY_TEAM') winnerTeamId = m.away_team_id

        const { error } = await supabase
          .from('matches')
          .update({ status: newStatus, home_score: newHome, away_score: newAway, winner_team_id: winnerTeamId, scheduled_at: fd.utcDate } as never)
          .eq('id', m.id)
        if (error) errors.push(`knockout match ${m.id}: ${error.message}`)
        else knockoutUpdated++
      } else {
        // Set status to reflect API state (scores already null from step 1)
        if (m.status !== newStatus || m.scheduled_at !== fd.utcDate) {
          await supabase.from('matches').update({ status: newStatus, scheduled_at: fd.utcDate } as never).eq('id', m.id)
        }
      }
    }
  }

  // ── Step 4: Rebuild cascade ──────────────────────────────────────────────────
  const cascade = await rebuildKnockoutCascade()
  errors.push(...cascade.errors)

  return {
    clearedKnockout,
    groupUpdated,
    groupCleared,
    knockoutUpdated,
    cascadeAssigned: cascade.assigned,
    cascadeEmptied: cascade.emptied,
    errors,
    // legacy aliases
    updated: groupUpdated + knockoutUpdated,
    cleared: groupCleared,
  }
}
