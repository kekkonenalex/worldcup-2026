import { createClient } from '@/lib/supabase/server'
import {
  computeActualStandings,
  rankThirdPlaceTeams,
  type MatchInput,
  type TeamInput,
  type TeamStanding,
  type ThirdPlaceResult,
  type ActualResultInput,
} from '@/lib/simulation'
import {
  BRACKET_STRUCTURE,
  assignThirdPlaceTeams,
  type FixedSource,
  type KnockoutMatchDef,
} from '@/lib/bracket'
import type { Match, Team } from '@/types/database'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

export async function recomputeBracketCascade(): Promise<void> {
  const supabase = await createClient()

  const [{ data: rawMatches }, { data: rawTeams }] = await Promise.all([
    supabase.from('matches').select('*').order('match_number', { ascending: true }),
    supabase.from('teams').select('*'),
  ])

  const matches = (rawMatches ?? []) as unknown as Match[]
  const teams = (rawTeams ?? []) as unknown as Team[]

  // ── Organize group data ────────────────────────────────────────────────────

  const matchInputsByGroup = new Map<string, MatchInput[]>()
  const resultsByGroup = new Map<string, ActualResultInput[]>()
  const teamInputsByGroup = new Map<string, TeamInput[]>()

  const groupMatches = matches.filter(m => m.stage === 'group')
  const finishedGroupMatches = groupMatches.filter(
    m => m.status === 'finished' && m.home_score != null && m.away_score != null
  )

  for (const m of groupMatches) {
    const letter = m.group_letter!
    if (!matchInputsByGroup.has(letter)) matchInputsByGroup.set(letter, [])
    matchInputsByGroup.get(letter)!.push({
      id: m.id,
      match_number: m.match_number,
      group_letter: letter,
      home_team_id: m.home_team_id!,
      away_team_id: m.away_team_id!,
    })
  }

  for (const m of finishedGroupMatches) {
    const letter = m.group_letter!
    if (!resultsByGroup.has(letter)) resultsByGroup.set(letter, [])
    resultsByGroup.get(letter)!.push({
      match_id: m.id,
      home_score: m.home_score!,
      away_score: m.away_score!,
    })
  }

  for (const t of teams) {
    const letter = t.group_letter
    if (!teamInputsByGroup.has(letter)) teamInputsByGroup.set(letter, [])
    teamInputsByGroup.get(letter)!.push({
      id: t.id,
      name: t.name,
      short_code: t.short_code,
      flag_emoji: t.flag_emoji,
      group_letter: letter,
    })
  }

  // ── Compute group standings ────────────────────────────────────────────────

  const allGroupStandings: TeamStanding[][] = []
  const groupStandingsMap = new Map<string, TeamStanding[]>()

  for (const letter of GROUP_LETTERS) {
    const gm = matchInputsByGroup.get(letter) ?? []
    const gr = resultsByGroup.get(letter) ?? []
    const gt = teamInputsByGroup.get(letter) ?? []
    if (gt.length === 0) continue
    const standings = computeActualStandings(letter, gm, gr, gt)
    allGroupStandings.push(standings)
    groupStandingsMap.set(letter, standings)
  }

  // ── Third-place assignment (only when all 72 group matches finished) ────────

  const allGroupFinished = finishedGroupMatches.length === 72

  let thirdPlaceResult: ThirdPlaceResult | null = null
  let thirdAssignment: Record<number, string> = {}

  if (allGroupFinished && allGroupStandings.length === 12) {
    try {
      thirdPlaceResult = rankThirdPlaceTeams(allGroupStandings)
      const advancingGroups = thirdPlaceResult.advancing.map(t => t.group_letter)
      thirdAssignment = assignThirdPlaceTeams(advancingGroups)
    } catch {
      // Assignment failed — skip R32 cascade
    }
  }

  // ── Build knockout maps from DB ────────────────────────────────────────────

  const knockoutMatches = matches.filter(m => m.match_number >= 73 && m.match_number <= 104)

  // match_number → winner team_id (from DB winner_team_id)
  const winnerMap = new Map<number, number>()
  // match_number → current team IDs (updated as we resolve)
  const matchTeamMap = new Map<number, { home: number | null; away: number | null }>()

  for (const m of knockoutMatches) {
    matchTeamMap.set(m.match_number, { home: m.home_team_id, away: m.away_team_id })
    if (m.winner_team_id != null) {
      winnerMap.set(m.match_number, m.winner_team_id)
    }
  }

  // ── Resolve team IDs for knockout matches and collect updates ──────────────

  const updates: Array<{ id: number; home_team_id: number | null; away_team_id: number | null }> = []

  for (const def of BRACKET_STRUCTURE) {
    // Can't populate R32 until group stage is complete
    if (def.stage === 'r32' && (!allGroupFinished || !thirdPlaceResult)) continue

    const resolveSlot = (slot: FixedSource): number | null => {
      switch (slot.kind) {
        case 'group_winner':
          return groupStandingsMap.get(slot.group)?.find(s => s.position === 1)?.team_id ?? null
        case 'group_runner_up':
          return groupStandingsMap.get(slot.group)?.find(s => s.position === 2)?.team_id ?? null
        case 'third_place': {
          if (!thirdPlaceResult) return null
          const assignedGroup = thirdAssignment[def.match_number]
          if (!assignedGroup) return null
          return thirdPlaceResult.advancing.find(t => t.group_letter === assignedGroup)?.team_id ?? null
        }
        case 'winner_of':
          return winnerMap.get(slot.match) ?? null
        case 'loser_of': {
          const winnerId = winnerMap.get(slot.match)
          if (winnerId == null) return null
          const entry = matchTeamMap.get(slot.match)
          if (!entry) return null
          if (entry.home === winnerId) return entry.away
          if (entry.away === winnerId) return entry.home
          return null
        }
      }
    }

    const homeId = resolveSlot(def.slot_a)
    const awayId = resolveSlot(def.slot_b)

    // Update live map so downstream slots resolve correctly in this same loop
    matchTeamMap.set(def.match_number, { home: homeId, away: awayId })

    const matchRow = matches.find(m => m.match_number === def.match_number)
    if (!matchRow) continue

    if (matchRow.home_team_id !== homeId || matchRow.away_team_id !== awayId) {
      updates.push({ id: matchRow.id, home_team_id: homeId, away_team_id: awayId })
    }
  }

  // ── Apply updates (individual — Supabase has no batch update with per-row values) ──

  for (const u of updates) {
    await supabase
      .from('matches')
      .update({ home_team_id: u.home_team_id, away_team_id: u.away_team_id } as never)
      .eq('id', u.id)
  }
}
