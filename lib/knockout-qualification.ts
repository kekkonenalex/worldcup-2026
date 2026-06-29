// Pure qualification logic — derives the 32 R32 teams from group results (actual)
// or from a user's group predictions. No React, no DB calls, no side effects.
//
// Reuses the canonical group-standings + third-place tiebreaker helpers in
// lib/simulation.ts so there is a single definition of "who qualified".

import type { Match, Team } from '@/types/database'
import {
  computeGroupStandings,
  computeActualStandings,
  rankThirdPlaceTeams,
  getAdvancingTeams,
  type MatchInput,
  type TeamInput,
  type PredictionInput,
  type ActualResultInput,
  type TeamStanding,
} from '@/lib/simulation'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

export interface QualifiedTeams {
  autoQualified: number[] // top 2 per group (24 teams)
  bestThirds: number[]    // best 8 of the 12 third-place teams
  allR32: number[]        // the full set of 32
  isComplete: boolean     // true only when ALL 72 group matches are finished
  warnings: string[]      // e.g. third-place 8th/9th boundary decided by fallback
}

// ── Shared input builders ──────────────────────────────────────────────────────

function buildGroupMatchInputs(groupMatches: Match[], letter: string): MatchInput[] {
  return groupMatches
    .filter(m => m.group_letter === letter && m.home_team_id != null && m.away_team_id != null)
    .map(m => ({
      id: m.id,
      match_number: m.match_number,
      group_letter: letter,
      home_team_id: m.home_team_id!,
      away_team_id: m.away_team_id!,
    }))
}

function buildGroupTeamInputs(teams: Team[], letter: string): TeamInput[] {
  return teams
    .filter(t => t.group_letter === letter)
    .map(t => ({
      id: t.id,
      name: t.name,
      short_code: t.short_code,
      flag_emoji: t.flag_emoji,
      group_letter: letter,
    }))
}

// ── Actual qualification (from recorded group results) ─────────────────────────

const isFinished = (m: Match): boolean => m.home_score != null && m.away_score != null

export function computeQualifiedTeams(groupMatches: Match[], teams: Team[]): QualifiedTeams {
  const groupOnly = groupMatches.filter(m => m.match_number <= 72)
  const finishedCount = groupOnly.filter(isFinished).length
  const isComplete = finishedCount === 72

  // R32 qualification points are awarded ONCE, only after every group match is in.
  if (!isComplete) {
    return { autoQualified: [], bestThirds: [], allR32: [], isComplete: false, warnings: [] }
  }

  const allStandings: TeamStanding[][] = []
  for (const letter of GROUP_LETTERS) {
    const matches = buildGroupMatchInputs(groupOnly, letter)
    const groupTeams = buildGroupTeamInputs(teams, letter)
    if (matches.length === 0 || groupTeams.length === 0) continue
    const results: ActualResultInput[] = groupOnly
      .filter(m => m.group_letter === letter && isFinished(m))
      .map(m => ({ match_id: m.id, home_score: m.home_score!, away_score: m.away_score! }))
    allStandings.push(computeActualStandings(letter, matches, results, groupTeams))
  }

  const thirdPlaceResult = rankThirdPlaceTeams(allStandings)

  const autoQualified = allStandings
    .flatMap(g => g.filter(s => s.position === 1 || s.position === 2))
    .map(s => s.team_id)
  const bestThirds = thirdPlaceResult.advancing.map(s => s.team_id)
  const allR32 = [...autoQualified, ...bestThirds]

  // Surface a warning if the 8th/9th best-third boundary was decided only by the
  // deterministic name fallback (tied on points, GD, GF) — Alex should then verify
  // the eight qualifiers match FIFA's official set.
  const warnings: string[] = []
  const thirds = allStandings
    .flatMap(g => g.filter(s => s.position === 3))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for
      return 0
    })
  if (thirds.length >= 9) {
    const eighth = thirds[7]
    const ninth = thirds[8]
    if (
      eighth.points === ninth.points &&
      eighth.goal_difference === ninth.goal_difference &&
      eighth.goals_for === ninth.goals_for
    ) {
      warnings.push(
        `Third-place qualification boundary (8th vs 9th: ${eighth.team_name} / ${ninth.team_name}) ` +
        `is tied on points, goal difference and goals scored — decided by deterministic fallback. ` +
        `Manually verify the best-8 thirds match FIFA's official set.`,
      )
    }
  }

  return { autoQualified, bestThirds, allR32, isComplete, warnings }
}

// ── Predicted qualification (from a user's group predictions) ──────────────────
//
// A user's predicted R32 set = the 32 teams that advance per THEIR predicted group
// standings. Returns an empty set if the user has not predicted all 72 group matches.

export function computePredictedR32(
  groupPredictions: { match_id: number; predicted_home_score: number; predicted_away_score: number }[],
  groupMatches: Match[],
  teams: Team[],
): Set<number> {
  const groupOnly = groupMatches.filter(m => m.match_number <= 72)
  if (groupPredictions.length < 72) return new Set()

  const predictions: PredictionInput[] = groupPredictions.map(p => ({
    match_id: p.match_id,
    predicted_home_score: p.predicted_home_score,
    predicted_away_score: p.predicted_away_score,
  }))

  try {
    const allStandings: TeamStanding[][] = []
    for (const letter of GROUP_LETTERS) {
      const matches = buildGroupMatchInputs(groupOnly, letter)
      const groupTeams = buildGroupTeamInputs(teams, letter)
      if (matches.length === 0 || groupTeams.length === 0) continue
      allStandings.push(computeGroupStandings(letter, matches, predictions, groupTeams))
    }
    const thirdPlaceResult = rankThirdPlaceTeams(allStandings)
    const advancing = getAdvancingTeams(allStandings, thirdPlaceResult)
    return new Set(advancing.map(s => s.team_id))
  } catch {
    // Missing prediction for some group match → treat as incomplete.
    return new Set()
  }
}
