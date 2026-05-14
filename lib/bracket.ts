// Pure bracket logic — no React, no DB calls, no side effects.
// bracket_position in knockout_predictions stores match_number values (73-104), NOT 1-32.

import type { TeamStanding, ThirdPlaceResult } from './simulation'

// ─── Types ───────────────────────────────────────────────────────────────────

export type FixedSource =
  | { kind: 'group_winner'; group: string }
  | { kind: 'group_runner_up'; group: string }
  | { kind: 'third_place'; pool: string[] }
  | { kind: 'winner_of'; match: number }
  | { kind: 'loser_of'; match: number }

export type KnockoutMatchDef = {
  match_number: number
  stage: 'r32' | 'r16' | 'qf' | 'sf' | 'third_place' | 'final'
  slot_a: FixedSource
  slot_b: FixedSource
  label: string
}

export type BracketContext = {
  groupStandings: TeamStanding[][]
  thirdPlaceResult: ThirdPlaceResult
  userPicks: Map<number, number> // match_number → predicted_team_id
}

export type ResolvedMatch = {
  match_number: number
  stage: KnockoutMatchDef['stage']
  label: string
  team_a: TeamStanding | null // null if upstream not resolved yet
  team_b: TeamStanding | null
  user_pick_team_id: number | null
}

// ─── Bracket structure (FIFA-accurate R32 pairing) ────────────────────────────

export const BRACKET_STRUCTURE: KnockoutMatchDef[] = [
  // ── Round of 32 ──────────────────────────────────────────────────────────
  {
    match_number: 73, stage: 'r32', label: 'R32 — Match 73',
    slot_a: { kind: 'group_runner_up', group: 'A' },
    slot_b: { kind: 'group_runner_up', group: 'B' },
  },
  {
    match_number: 74, stage: 'r32', label: 'R32 — Match 74',
    slot_a: { kind: 'group_winner', group: 'E' },
    slot_b: { kind: 'third_place', pool: ['A', 'B', 'C', 'D', 'F'] },
  },
  {
    match_number: 75, stage: 'r32', label: 'R32 — Match 75',
    slot_a: { kind: 'group_winner', group: 'F' },
    slot_b: { kind: 'group_runner_up', group: 'C' },
  },
  {
    match_number: 76, stage: 'r32', label: 'R32 — Match 76',
    slot_a: { kind: 'group_winner', group: 'C' },
    slot_b: { kind: 'group_runner_up', group: 'F' },
  },
  {
    match_number: 77, stage: 'r32', label: 'R32 — Match 77',
    slot_a: { kind: 'group_winner', group: 'I' },
    slot_b: { kind: 'third_place', pool: ['C', 'D', 'F', 'G', 'H'] },
  },
  {
    match_number: 78, stage: 'r32', label: 'R32 — Match 78',
    slot_a: { kind: 'group_runner_up', group: 'E' },
    slot_b: { kind: 'group_runner_up', group: 'I' },
  },
  {
    match_number: 79, stage: 'r32', label: 'R32 — Match 79',
    slot_a: { kind: 'group_winner', group: 'A' },
    slot_b: { kind: 'third_place', pool: ['C', 'E', 'F', 'H', 'I'] },
  },
  {
    match_number: 80, stage: 'r32', label: 'R32 — Match 80',
    slot_a: { kind: 'group_winner', group: 'L' },
    slot_b: { kind: 'third_place', pool: ['E', 'H', 'I', 'J', 'K'] },
  },
  {
    match_number: 81, stage: 'r32', label: 'R32 — Match 81',
    slot_a: { kind: 'group_winner', group: 'D' },
    slot_b: { kind: 'third_place', pool: ['B', 'E', 'F', 'I', 'J'] },
  },
  {
    match_number: 82, stage: 'r32', label: 'R32 — Match 82',
    slot_a: { kind: 'group_winner', group: 'G' },
    slot_b: { kind: 'third_place', pool: ['A', 'E', 'H', 'I', 'J'] },
  },
  {
    match_number: 83, stage: 'r32', label: 'R32 — Match 83',
    slot_a: { kind: 'group_runner_up', group: 'K' },
    slot_b: { kind: 'group_runner_up', group: 'L' },
  },
  {
    match_number: 84, stage: 'r32', label: 'R32 — Match 84',
    slot_a: { kind: 'group_winner', group: 'H' },
    slot_b: { kind: 'group_runner_up', group: 'J' },
  },
  {
    match_number: 85, stage: 'r32', label: 'R32 — Match 85',
    slot_a: { kind: 'group_winner', group: 'B' },
    slot_b: { kind: 'third_place', pool: ['E', 'F', 'G', 'I', 'J'] },
  },
  {
    match_number: 86, stage: 'r32', label: 'R32 — Match 86',
    slot_a: { kind: 'group_winner', group: 'J' },
    slot_b: { kind: 'group_runner_up', group: 'H' },
  },
  {
    match_number: 87, stage: 'r32', label: 'R32 — Match 87',
    slot_a: { kind: 'group_winner', group: 'K' },
    slot_b: { kind: 'third_place', pool: ['D', 'E', 'I', 'J', 'L'] },
  },
  {
    match_number: 88, stage: 'r32', label: 'R32 — Match 88',
    slot_a: { kind: 'group_runner_up', group: 'D' },
    slot_b: { kind: 'group_runner_up', group: 'G' },
  },

  // ── Round of 16 ──────────────────────────────────────────────────────────
  {
    match_number: 89, stage: 'r16', label: 'R16 — Match 89',
    slot_a: { kind: 'winner_of', match: 74 },
    slot_b: { kind: 'winner_of', match: 77 },
  },
  {
    match_number: 90, stage: 'r16', label: 'R16 — Match 90',
    slot_a: { kind: 'winner_of', match: 73 },
    slot_b: { kind: 'winner_of', match: 75 },
  },
  {
    match_number: 91, stage: 'r16', label: 'R16 — Match 91',
    slot_a: { kind: 'winner_of', match: 76 },
    slot_b: { kind: 'winner_of', match: 78 },
  },
  {
    match_number: 92, stage: 'r16', label: 'R16 — Match 92',
    slot_a: { kind: 'winner_of', match: 79 },
    slot_b: { kind: 'winner_of', match: 80 },
  },
  {
    match_number: 93, stage: 'r16', label: 'R16 — Match 93',
    slot_a: { kind: 'winner_of', match: 83 },
    slot_b: { kind: 'winner_of', match: 84 },
  },
  {
    match_number: 94, stage: 'r16', label: 'R16 — Match 94',
    slot_a: { kind: 'winner_of', match: 81 },
    slot_b: { kind: 'winner_of', match: 82 },
  },
  {
    match_number: 95, stage: 'r16', label: 'R16 — Match 95',
    slot_a: { kind: 'winner_of', match: 86 },
    slot_b: { kind: 'winner_of', match: 88 },
  },
  {
    match_number: 96, stage: 'r16', label: 'R16 — Match 96',
    slot_a: { kind: 'winner_of', match: 85 },
    slot_b: { kind: 'winner_of', match: 87 },
  },

  // ── Quarter-finals ───────────────────────────────────────────────────────
  {
    match_number: 97, stage: 'qf', label: 'QF — Match 97',
    slot_a: { kind: 'winner_of', match: 89 },
    slot_b: { kind: 'winner_of', match: 90 },
  },
  {
    match_number: 98, stage: 'qf', label: 'QF — Match 98',
    slot_a: { kind: 'winner_of', match: 93 },
    slot_b: { kind: 'winner_of', match: 94 },
  },
  {
    match_number: 99, stage: 'qf', label: 'QF — Match 99',
    slot_a: { kind: 'winner_of', match: 91 },
    slot_b: { kind: 'winner_of', match: 92 },
  },
  {
    match_number: 100, stage: 'qf', label: 'QF — Match 100',
    slot_a: { kind: 'winner_of', match: 95 },
    slot_b: { kind: 'winner_of', match: 96 },
  },

  // ── Semi-finals ──────────────────────────────────────────────────────────
  {
    match_number: 101, stage: 'sf', label: 'SF — Match 101',
    slot_a: { kind: 'winner_of', match: 97 },
    slot_b: { kind: 'winner_of', match: 98 },
  },
  {
    match_number: 102, stage: 'sf', label: 'SF — Match 102',
    slot_a: { kind: 'winner_of', match: 99 },
    slot_b: { kind: 'winner_of', match: 100 },
  },

  // ── Third-place play-off ──────────────────────────────────────────────────
  {
    match_number: 103, stage: 'third_place', label: '3rd Place — Match 103',
    slot_a: { kind: 'loser_of', match: 101 },
    slot_b: { kind: 'loser_of', match: 102 },
  },

  // ── Final ─────────────────────────────────────────────────────────────────
  {
    match_number: 104, stage: 'final', label: 'Final — Match 104',
    slot_a: { kind: 'winner_of', match: 101 },
    slot_b: { kind: 'winner_of', match: 102 },
  },
]

// ─── Stage helpers ────────────────────────────────────────────────────────────

export const STAGE_ORDER = ['r32', 'r16', 'qf', 'sf', 'final_and_third'] as const

export const STAGE_LABELS: Record<string, string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  final_and_third: 'Final & 3rd Place',
}

export function getStageMatches(stage: string): KnockoutMatchDef[] {
  if (stage === 'final_and_third') {
    return BRACKET_STRUCTURE.filter(m => m.stage === 'final' || m.stage === 'third_place')
  }
  return BRACKET_STRUCTURE.filter(m => m.stage === stage)
}

// Returns all match numbers that depend (directly or transitively) on the given match.
// Derived from the BRACKET_STRUCTURE dependency graph, not hardcoded.
export function getDownstreamMatches(matchNumber: number): number[] {
  const result: number[] = []
  const visited = new Set<number>()
  const queue: number[] = [matchNumber]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const m of BRACKET_STRUCTURE) {
      if (visited.has(m.match_number)) continue
      const dependsOnCurrent =
        (m.slot_a.kind === 'winner_of' || m.slot_a.kind === 'loser_of') && m.slot_a.match === current ||
        (m.slot_b.kind === 'winner_of' || m.slot_b.kind === 'loser_of') && m.slot_b.match === current
      if (dependsOnCurrent) {
        visited.add(m.match_number)
        result.push(m.match_number)
        queue.push(m.match_number)
      }
    }
  }

  return result
}

// ─── Third-place solver ───────────────────────────────────────────────────────

// Match numbers that each contain one third-place slot, in order.
const THIRD_PLACE_SLOT_MATCHES = [74, 77, 79, 80, 81, 82, 85, 87]

type ThirdSlot = { matchNum: number; pool: string[] }

function buildThirdSlots(): ThirdSlot[] {
  return THIRD_PLACE_SLOT_MATCHES.map(matchNum => {
    const def = BRACKET_STRUCTURE.find(m => m.match_number === matchNum)!
    let pool: string[] = []
    if (def.slot_a.kind === 'third_place') pool = def.slot_a.pool
    else if (def.slot_b.kind === 'third_place') pool = def.slot_b.pool
    return { matchNum, pool }
  })
}

// Assigns each qualifying third-place group to exactly one R32 slot via backtracking.
// Input: exactly 8 group letters (e.g. ['A','C','D','F','G','H','I','K']).
// Output: match_number → group letter assignment.
// Deterministic: same input always produces the same output (groups tried alphabetically).
export function assignThirdPlaceTeams(
  qualifyingGroups: string[]
): Record<number, string> {
  const sorted = [...qualifyingGroups].sort()
  const slots = buildThirdSlots()
  const assignment: Record<number, string> = {}
  const used = new Set<string>()

  function backtrack(slotIdx: number): boolean {
    if (slotIdx === slots.length) return true
    const slot = slots[slotIdx]
    for (const group of sorted) {
      if (used.has(group)) continue
      if (!slot.pool.includes(group)) continue
      assignment[slot.matchNum] = group
      used.add(group)
      if (backtrack(slotIdx + 1)) return true
      delete assignment[slot.matchNum]
      used.delete(group)
    }
    return false
  }

  if (!backtrack(0)) throw new Error('No valid third-place assignment')
  return assignment
}

// ─── Slot resolution ──────────────────────────────────────────────────────────

export function resolveBracket(context: BracketContext): ResolvedMatch[] {
  const { groupStandings, thirdPlaceResult, userPicks } = context

  // Build group letter → standings lookup
  const groupMap = new Map<string, TeamStanding[]>()
  for (const standings of groupStandings) {
    if (standings.length > 0) groupMap.set(standings[0].group_letter, standings)
  }

  // Build team_id → TeamStanding from all 48 group teams
  const teamById = new Map<number, TeamStanding>()
  for (const standings of groupStandings) {
    for (const s of standings) teamById.set(s.team_id, s)
  }

  // Third-place group assignment: match_number → group letter
  const advancingGroups = thirdPlaceResult.advancing.map(t => t.group_letter)
  const thirdAssignment = assignThirdPlaceTeams(advancingGroups)

  // Resolved matches indexed by match_number for upstream lookups
  const resolvedByNumber = new Map<number, ResolvedMatch>()
  const results: ResolvedMatch[] = []

  for (const def of BRACKET_STRUCTURE) {
    const resolveSlot = (slot: FixedSource): TeamStanding | null => {
      switch (slot.kind) {
        case 'group_winner':
          return groupMap.get(slot.group)?.find(s => s.position === 1) ?? null
        case 'group_runner_up':
          return groupMap.get(slot.group)?.find(s => s.position === 2) ?? null
        case 'third_place': {
          const assignedGroup = thirdAssignment[def.match_number]
          if (!assignedGroup) return null
          return thirdPlaceResult.advancing.find(t => t.group_letter === assignedGroup) ?? null
        }
        case 'winner_of': {
          const pickId = userPicks.get(slot.match)
          if (pickId == null) return null
          return teamById.get(pickId) ?? null
        }
        case 'loser_of': {
          const upstream = resolvedByNumber.get(slot.match)
          if (!upstream) return null
          const pickId = userPicks.get(slot.match)
          if (pickId == null) return null
          const { team_a, team_b } = upstream
          if (!team_a || !team_b) return null
          if (team_a.team_id === pickId) return team_b
          if (team_b.team_id === pickId) return team_a
          return null
        }
      }
    }

    const resolved: ResolvedMatch = {
      match_number: def.match_number,
      stage: def.stage,
      label: def.label,
      team_a: resolveSlot(def.slot_a),
      team_b: resolveSlot(def.slot_b),
      user_pick_team_id: userPicks.get(def.match_number) ?? null,
    }

    resolvedByNumber.set(def.match_number, resolved)
    results.push(resolved)
  }

  return results
}
