// Pure scoring functions — no Supabase imports, no side effects.

import type {
  Match,
  GroupPrediction,
  KnockoutPrediction,
  AwardPrediction,
  Team,
  AwardResults,
} from '@/types/database'

import { computePredictedR32 } from '@/lib/knockout-qualification'
import { getAdvancedTeamsByRound } from '@/lib/knockout-advancement'

export type AwardResult = AwardResults

export type KnockoutRound = 'R32' | 'R16' | 'QF' | 'SF' | 'Final' | 'Champion'

// Phase 33 model: cumulative points per round REACHED (path-independent).
// Reaching R32 (= qualifying from groups) is the first scored event. Values stack:
// a team predicted & reaching the Final earns 6+8+10+15+20 = 59.
// The Champion tier (winning the final) keeps its +20 increment; the Top-4 bonus
// (+25 per exact finish position) is computed separately in computeUserScore.
export const ROUND_POINTS: Record<KnockoutRound, number> = {
  R32: 6,
  R16: 8,
  QF: 10,
  SF: 15,
  Final: 20,
  Champion: 20,
}

export const TOP_FOUR_BONUS = 25

const ROUND_ORDER: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', 'Final', 'Champion']
const roundIndex = (r: KnockoutRound) => ROUND_ORDER.indexOf(r)
const minRound = (a: KnockoutRound, b: KnockoutRound): KnockoutRound =>
  roundIndex(a) <= roundIndex(b) ? a : b

// ── Group match scoring ────────────────────────────────────────────────────────
//
// Points: 6 exact | 5 correct result+GD not exact | 3 correct result wrong GD | 0 wrong
// Bonus +1 (on base 0 or 3 only): if either team's goal count matches (including 0).
// Bonus never applies to exact scores (base 6) or correct-GD scores (base 5).

export function scoreGroupMatch(
  pred: { home: number; away: number } | null,
  actual: { home: number; away: number } | null,
): number {
  if (pred === null || actual === null) return 0

  if (pred.home === actual.home && pred.away === actual.away) return 6

  const predResult = Math.sign(pred.home - pred.away)
  const actualResult = Math.sign(actual.home - actual.away)

  const tallyBonus =
    pred.home === actual.home ||
    pred.away === actual.away
      ? 1
      : 0

  if (predResult !== actualResult) return tallyBonus

  const predGD = pred.home - pred.away
  const actualGD = actual.home - actual.away
  if (predGD === actualGD) return 5  // bonus never applies at base 5

  return 3 + tallyBonus
}

// ── Actual knockout placements ─────────────────────────────────────────────────
//
// Reads winner_team_id across matches 73–104 to determine each team's furthest round.
// Match 103 (3rd-place playoff) winners do not upgrade beyond 'SF'.

const ACTUAL_MATCH_RANGES: Array<{ min: number; max: number; round: KnockoutRound }> = [
  { min: 73,  max: 88,  round: 'R16' },
  { min: 89,  max: 96,  round: 'QF' },
  { min: 97,  max: 100, round: 'SF' },
  { min: 101, max: 102, round: 'Final' },
  { min: 104, max: 104, round: 'Champion' },
]

export function getActualKnockoutPlacements(
  matches: Match[],
  actualR32: Set<number> | null = null,
): Map<string, KnockoutRound> {
  const placements = new Map<string, KnockoutRound>()

  // R32 layer: teams that qualified from the groups. Awarded only once the full
  // group stage is finished (caller passes null until then → no R32 points).
  if (actualR32) {
    for (const teamId of actualR32) placements.set(String(teamId), 'R32')
  }

  for (const m of matches) {
    if (m.winner_team_id == null) continue
    const teamKey = String(m.winner_team_id)

    let round: KnockoutRound | null = null
    for (const range of ACTUAL_MATCH_RANGES) {
      if (m.match_number >= range.min && m.match_number <= range.max) {
        round = range.round
        break
      }
    }
    if (round === null) continue

    const current = placements.get(teamKey)
    if (!current || roundIndex(round) > roundIndex(current)) {
      placements.set(teamKey, round)
    }
  }

  return placements
}

// ── Predicted knockout placements ──────────────────────────────────────────────
//
// Derives from bracket_position (= match_number) in knockout_predictions.
// Does not call resolveBracket — the user's explicit picks are read directly.
// Match 103 (3rd-place): predicted winner stays at SF level.

const PREDICTED_MATCH_RANGES: Array<{ min: number; max: number; round: KnockoutRound }> = [
  { min: 73,  max: 88,  round: 'R16' },
  { min: 89,  max: 96,  round: 'QF' },
  { min: 97,  max: 100, round: 'SF' },
  { min: 101, max: 102, round: 'Final' },
  { min: 104, max: 104, round: 'Champion' },
]

export function getPredictedKnockoutPlacements(
  knockoutPredictions: KnockoutPrediction[],
  predictedR32: Set<number> | null = null,
): Map<string, KnockoutRound> {
  const placements = new Map<string, KnockoutRound>()

  // R32 layer: the user's 32 predicted qualifiers (derived from their group
  // predictions, since there are no stored "reaches R32" rows).
  if (predictedR32) {
    for (const teamId of predictedR32) placements.set(String(teamId), 'R32')
  }

  for (const p of knockoutPredictions) {
    const teamKey = String(p.predicted_team_id)

    let round: KnockoutRound | null = null
    for (const range of PREDICTED_MATCH_RANGES) {
      if (p.bracket_position >= range.min && p.bracket_position <= range.max) {
        round = range.round
        break
      }
    }
    if (round === null) continue

    const current = placements.get(teamKey)
    if (!current || roundIndex(round) > roundIndex(current)) {
      placements.set(teamKey, round)
    }
  }

  return placements
}

// ── Knockout scoring ───────────────────────────────────────────────────────────
//
// Per-team points: cumulative sum of ROUND_POINTS for every round from R16 up
// to MIN(predictedRound, actualRound). Top-4 bonus is computed separately in
// computeUserScore using exact finish-position matching.

export function scoreKnockoutForUser(
  predictedPlacements: Map<string, KnockoutRound>,
  actualPlacements: Map<string, KnockoutRound>,
): { perTeam: Map<string, number>; basePoints: number; total: number } {
  const perTeam = new Map<string, number>()
  let basePoints = 0

  for (const [teamKey, actualRound] of actualPlacements) {
    const predictedRound = predictedPlacements.get(teamKey)
    if (!predictedRound) continue

    const cap = minRound(predictedRound, actualRound)
    const capIdx = roundIndex(cap)
    let pts = 0
    for (let i = 0; i <= capIdx; i++) {
      pts += ROUND_POINTS[ROUND_ORDER[i]]
    }
    perTeam.set(teamKey, pts)
    basePoints += pts
  }

  return { perTeam, basePoints, total: basePoints }
}

// ── Knockout per-team-per-round detail (for profile UI) ─────────────────────────
//
// Derives display rows from the same placement maps the scoring total uses, so the
// UI is always consistent with the points awarded. For each round, lists the teams
// the user predicted to REACH that round and their status:
//   advanced — team actually reached the round (✅, points earned)
//   pending  — round not yet resolved for this team (⬜, no points yet)
//   missed   — team eliminated / failed to reach the round (❌, 0 points)

export type KnockoutDetailRound = 'R32' | 'R16' | 'QF' | 'SF' | 'Final'
const DETAIL_ROUNDS: KnockoutDetailRound[] = ['R32', 'R16', 'QF', 'SF', 'Final']

export interface KnockoutTeamStatus {
  teamId: number
  name: string
  shortCode: string
  flag: string | null
  status: 'advanced' | 'pending' | 'missed'
  points: number
}

export interface KnockoutRoundDetail {
  round: KnockoutDetailRound
  pointValue: number
  teams: KnockoutTeamStatus[]
}

export function buildKnockoutDetail(input: {
  predictedPlacements: Map<string, KnockoutRound>
  actualPlacements: Map<string, KnockoutRound>
  eliminated: Set<number>
  teams: Team[]
  groupsComplete: boolean
}): KnockoutRoundDetail[] {
  const { predictedPlacements, actualPlacements, eliminated, teams, groupsComplete } = input

  const teamById = new Map<number, Team>()
  for (const t of teams) teamById.set(t.id, t)

  const reachedIdx = (map: Map<string, KnockoutRound>, teamKey: string): number => {
    const r = map.get(teamKey)
    return r ? roundIndex(r) : -1
  }

  return DETAIL_ROUNDS.map(round => {
    const rIdx = roundIndex(round)
    const pointValue = ROUND_POINTS[round]
    const rows: KnockoutTeamStatus[] = []

    for (const [teamKey, predRound] of predictedPlacements) {
      // Did the user predict this team to reach (at least) this round?
      if (roundIndex(predRound) < rIdx) continue

      const teamId = Number(teamKey)
      const advanced = reachedIdx(actualPlacements, teamKey) >= rIdx

      let status: KnockoutTeamStatus['status']
      if (advanced) status = 'advanced'
      else if (eliminated.has(teamId) || (round === 'R32' && groupsComplete)) status = 'missed'
      else status = 'pending'

      const team = teamById.get(teamId)
      rows.push({
        teamId,
        name: team?.name ?? teamKey,
        shortCode: team?.short_code ?? '',
        flag: team?.flag_emoji ?? null,
        status,
        points: advanced ? pointValue : 0,
      })
    }

    rows.sort((a, b) => a.shortCode.localeCompare(b.shortCode))
    return { round, pointValue, teams: rows }
  })
}

// ── Award scoring ──────────────────────────────────────────────────────────────

export function scoreAwardsForUser(
  prediction: AwardPrediction | null,
  actual: AwardResult | null,
): { boot: number; bootTally: number; ball: number; glove: number; young: number; total: number } {
  const zero = { boot: 0, bootTally: 0, ball: 0, glove: 0, young: 0, total: 0 }
  if (!prediction || !actual) return zero

  const nameMatch = (a: string | null | undefined, b: string | null | undefined): boolean =>
    a != null && b != null && a.trim().toLowerCase() === b.trim().toLowerCase()

  const boot = nameMatch(prediction.golden_boot_player, actual.golden_boot_player) ? 20 : 0
  const bootTally =
    prediction.golden_boot_goals != null &&
    actual.golden_boot_goals != null &&
    prediction.golden_boot_goals === actual.golden_boot_goals
      ? 10
      : 0
  const ball = nameMatch(prediction.golden_ball_player, actual.golden_ball_player) ? 20 : 0
  const glove = nameMatch(prediction.golden_glove_player, actual.golden_glove_player) ? 20 : 0
  const young = nameMatch(prediction.best_young_player, actual.best_young_player) ? 15 : 0

  return { boot, bootTally, ball, glove, young, total: boot + bootTally + ball + glove + young }
}

// ── Full user score ────────────────────────────────────────────────────────────

export interface UserScoreBreakdown {
  groupTotal: number
  groupPerMatch: Map<string, number>
  knockoutTotal: number
  knockoutPerTeam: Map<string, number>
  knockoutDetail: KnockoutRoundDetail[]
  knockoutR32Resolved: boolean
  topFourBonus: number
  awardsTotal: number
  awardsBreakdown: { boot: number; bootTally: number; ball: number; glove: number; young: number }
  total: number
  tiebreakers: {
    gold: 0 | 1
    silver: 0 | 1
    bronze: 0 | 1
    goldenBoot: 0 | 1
    groupPoints: number
    r32Correct: number
  }
}

export function computeUserScore(input: {
  userId: string
  groupPredictions: GroupPrediction[]
  groupMatches: Match[]
  knockoutPredictions: KnockoutPrediction[]
  knockoutMatches: Match[]
  awardPrediction: AwardPrediction | null
  awardResult: AwardResult | null
  teams: Team[]
  // The 32 teams that actually qualified from the groups, or null until all 72
  // group matches are finished (R32 points pending). Computed once by the caller.
  actualR32Qualified?: Set<number> | null
}): UserScoreBreakdown {
  const {
    groupPredictions,
    groupMatches,
    knockoutPredictions,
    knockoutMatches,
    awardPrediction,
    awardResult,
    teams,
    actualR32Qualified = null,
  } = input

  // ── Group stage ──
  const groupPerMatch = new Map<string, number>()
  let groupTotal = 0

  const predByMatchId = new Map<number, GroupPrediction>()
  for (const p of groupPredictions) predByMatchId.set(p.match_id, p)

  for (const m of groupMatches) {
    const pred = predByMatchId.get(m.id)
    const predGoals = pred
      ? { home: pred.predicted_home_score, away: pred.predicted_away_score }
      : null
    const actualGoals =
      m.home_score != null && m.away_score != null
        ? { home: m.home_score, away: m.away_score }
        : null
    const pts = scoreGroupMatch(predGoals, actualGoals)
    groupPerMatch.set(String(m.id), pts)
    groupTotal += pts
  }

  // ── Knockout ──
  const predictedR32 = computePredictedR32(groupPredictions, groupMatches, teams)
  const predictedPlacements = getPredictedKnockoutPlacements(knockoutPredictions, predictedR32)
  const actualPlacements = getActualKnockoutPlacements(knockoutMatches, actualR32Qualified)

  const { perTeam: knockoutPerTeam, basePoints: knockoutTotal } =
    scoreKnockoutForUser(predictedPlacements, actualPlacements)

  // Per-team-per-round detail for the profile UI (consistent with knockoutTotal).
  const advancement = getAdvancedTeamsByRound(knockoutMatches, actualR32Qualified)
  const knockoutDetail = buildKnockoutDetail({
    predictedPlacements,
    actualPlacements,
    eliminated: advancement.eliminated,
    teams,
    groupsComplete: actualR32Qualified != null,
  })

  // ── Top-4 positions (shared by bonus and tiebreakers) ──
  const predictedChampionId =
    [...predictedPlacements.entries()].find(([, r]) => r === 'Champion')?.[0] ?? null
  const actualChampionId =
    [...actualPlacements.entries()].find(([, r]) => r === 'Champion')?.[0] ?? null

  const predictedRunnerUpId =
    [...predictedPlacements.entries()].find(([, r]) => r === 'Final')?.[0] ?? null
  const actualRunnerUpId =
    [...actualPlacements.entries()].find(([, r]) => r === 'Final')?.[0] ?? null

  const match103 = knockoutMatches.find(m => m.match_number === 103)
  const actualThirdId = match103?.winner_team_id != null ? String(match103.winner_team_id) : null
  const actualFourthId =
    match103 && actualThirdId != null && match103.home_team_id != null && match103.away_team_id != null
      ? (String(match103.home_team_id) === actualThirdId
          ? String(match103.away_team_id)
          : String(match103.home_team_id))
      : null

  const pred103Pick = knockoutPredictions.find(p => p.bracket_position === 103)
  const predictedThirdId = pred103Pick != null ? String(pred103Pick.predicted_team_id) : null
  // Predicted 4th = whichever SF-level team is not the predicted 3rd-place winner
  const sfPredictedTeams = [...predictedPlacements.entries()]
    .filter(([, r]) => r === 'SF')
    .map(([k]) => k)
  const predictedFourthId = sfPredictedTeams.find(t => t !== predictedThirdId) ?? null

  // ── Top-4 bonus (exact finish-position matching, +25 per correct slot) ──
  let topFourBonus = 0
  if (predictedChampionId !== null && actualChampionId !== null && predictedChampionId === actualChampionId)
    topFourBonus += TOP_FOUR_BONUS
  if (predictedRunnerUpId !== null && actualRunnerUpId !== null && predictedRunnerUpId === actualRunnerUpId)
    topFourBonus += TOP_FOUR_BONUS
  if (predictedThirdId !== null && actualThirdId !== null && predictedThirdId === actualThirdId)
    topFourBonus += TOP_FOUR_BONUS
  if (predictedFourthId !== null && actualFourthId !== null && predictedFourthId === actualFourthId)
    topFourBonus += TOP_FOUR_BONUS

  // ── Awards ──
  const awardsBreakdown = scoreAwardsForUser(awardPrediction, awardResult)
  const awardsTotal = awardsBreakdown.total

  // ── Total ──
  const total = groupTotal + knockoutTotal + topFourBonus + awardsTotal

  // ── Tiebreakers ──
  const gold: 0 | 1 =
    predictedChampionId !== null && actualChampionId !== null && predictedChampionId === actualChampionId
      ? 1 : 0

  const silver: 0 | 1 =
    predictedRunnerUpId !== null && actualRunnerUpId !== null && predictedRunnerUpId === actualRunnerUpId
      ? 1 : 0

  const bronze: 0 | 1 =
    predictedThirdId !== null && actualThirdId !== null && predictedThirdId === actualThirdId ? 1 : 0

  // GoldenBoot tiebreaker
  const goldenBoot: 0 | 1 = (() => {
    if (!awardPrediction?.golden_boot_player || !awardResult?.golden_boot_player) return 0
    return awardPrediction.golden_boot_player.trim().toLowerCase() ===
      awardResult.golden_boot_player.trim().toLowerCase()
      ? 1
      : 0
  })()

  // r32Correct: user's predicted R32 winners (bracket_position 73–88) that actually won R32
  const actualR32WinnerSet = new Set(
    knockoutMatches
      .filter(m => m.match_number >= 73 && m.match_number <= 88 && m.winner_team_id != null)
      .map(m => String(m.winner_team_id)),
  )
  const r32Correct = knockoutPredictions
    .filter(p => p.bracket_position >= 73 && p.bracket_position <= 88)
    .filter(p => actualR32WinnerSet.has(String(p.predicted_team_id))).length

  return {
    groupTotal,
    groupPerMatch,
    knockoutTotal,
    knockoutPerTeam,
    knockoutDetail,
    knockoutR32Resolved: actualR32Qualified != null,
    topFourBonus,
    awardsTotal,
    awardsBreakdown: {
      boot: awardsBreakdown.boot,
      bootTally: awardsBreakdown.bootTally,
      ball: awardsBreakdown.ball,
      glove: awardsBreakdown.glove,
      young: awardsBreakdown.young,
    },
    total,
    tiebreakers: { gold, silver, bronze, goldenBoot, groupPoints: groupTotal, r32Correct },
  }
}

// ── Ranking ────────────────────────────────────────────────────────────────────

function compareBreakdowns(a: UserScoreBreakdown, b: UserScoreBreakdown): number {
  if (b.total !== a.total) return b.total - a.total
  if (b.tiebreakers.gold !== a.tiebreakers.gold) return b.tiebreakers.gold - a.tiebreakers.gold
  if (b.tiebreakers.silver !== a.tiebreakers.silver) return b.tiebreakers.silver - a.tiebreakers.silver
  if (b.tiebreakers.bronze !== a.tiebreakers.bronze) return b.tiebreakers.bronze - a.tiebreakers.bronze
  if (b.tiebreakers.goldenBoot !== a.tiebreakers.goldenBoot)
    return b.tiebreakers.goldenBoot - a.tiebreakers.goldenBoot
  if (b.tiebreakers.groupPoints !== a.tiebreakers.groupPoints)
    return b.tiebreakers.groupPoints - a.tiebreakers.groupPoints
  if (b.tiebreakers.r32Correct !== a.tiebreakers.r32Correct)
    return b.tiebreakers.r32Correct - a.tiebreakers.r32Correct
  return 0
}

export function rankUsers(
  scores: Array<{ userId: string; breakdown: UserScoreBreakdown }>,
): Array<{ userId: string; breakdown: UserScoreBreakdown; rank: number }> {
  const sorted = [...scores].sort((a, b) => compareBreakdowns(a.breakdown, b.breakdown))

  const result: Array<{ userId: string; breakdown: UserScoreBreakdown; rank: number }> = []
  for (let i = 0; i < sorted.length; i++) {
    const rank =
      i > 0 && compareBreakdowns(sorted[i].breakdown, sorted[i - 1].breakdown) === 0
        ? result[i - 1].rank
        : i + 1
    result.push({ userId: sorted[i].userId, breakdown: sorted[i].breakdown, rank })
  }

  return result
}
