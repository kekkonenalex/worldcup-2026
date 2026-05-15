// Run with: npx tsx scripts/test-scoring.ts
// Uses relative imports to avoid @/ alias resolution in plain tsx invocations.

import {
  scoreGroupMatch,
  scoreKnockoutForUser,
  scoreAwardsForUser,
  rankUsers,
  ROUND_POINTS,
  TOP_FOUR_BONUS,
  type KnockoutRound,
  type UserScoreBreakdown,
} from '../lib/scoring'

// ── Test harness ──────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(label: string, expected: number | string | boolean, got: number | string | boolean) {
  if (expected === got) {
    console.log(`PASS: ${label}`)
    passed++
  } else {
    console.log(`FAIL: ${label}  expected=${expected}  got=${got}`)
    failed++
  }
}

// ── Group stage ────────────────────────────────────────────────────────────────

assert('exact match (2-1 vs 2-1) → 6',
  6, scoreGroupMatch({ home: 2, away: 1 }, { home: 2, away: 1 }))

assert('correct result + GD, not exact (3-1 vs 2-0) → 5',
  5, scoreGroupMatch({ home: 3, away: 1 }, { home: 2, away: 0 }))

assert('correct result, wrong GD (2-0 vs 1-0) → 3',
  3, scoreGroupMatch({ home: 2, away: 0 }, { home: 1, away: 0 }))

assert('wrong result (1-2 vs 2-1) → 0',
  0, scoreGroupMatch({ home: 1, away: 2 }, { home: 2, away: 1 }))

assert('correct result, wrong GD, home tally matches (2-0 vs 2-1) → 4',
  4, scoreGroupMatch({ home: 2, away: 0 }, { home: 2, away: 1 }))

assert('wrong result, away tally matches (2-1 vs 0-1) → 1',
  1, scoreGroupMatch({ home: 2, away: 1 }, { home: 0, away: 1 }))

assert('exact match no bonus stacking (1-0 vs 1-0) → 6',
  6, scoreGroupMatch({ home: 1, away: 0 }, { home: 1, away: 0 }))

assert('correct GD+result has no bonus (3-1 vs 2-0) → 5',
  5, scoreGroupMatch({ home: 3, away: 1 }, { home: 2, away: 0 }))

assert('null prediction → 0',
  0, scoreGroupMatch(null, { home: 2, away: 1 }))

// ── Knockout scoring ───────────────────────────────────────────────────────────
//
// Tests use placement maps directly to isolate scoreKnockoutForUser.
// Top-4 bonus: +25 per team where BOTH predicted ≥ SF AND actual ≥ SF.

function makePlacements(entries: Array<[string, KnockoutRound]>): Map<string, KnockoutRound> {
  return new Map(entries)
}

// Case 1: Team A predicted Champion, actually Champion → 20 + 25 = 45
{
  const pred = makePlacements([['A', 'Champion']])
  const actual = makePlacements([['A', 'Champion']])
  const { total } = scoreKnockoutForUser(pred, actual)
  assert('knockout: predicted Champion, actually Champion → 45', 45, total)
}

// Case 2: Team A predicted Champion, actually eliminated in QF → 8
{
  const pred = makePlacements([['A', 'Champion']])
  const actual = makePlacements([['A', 'QF']])
  const { total } = scoreKnockoutForUser(pred, actual)
  assert('knockout: predicted Champion, actually QF → 8', 8, total)
}

// Case 3: Team A predicted SF (in top-4), actually Champion → 10 + 25 = 35
{
  const pred = makePlacements([['A', 'SF']])
  const actual = makePlacements([['A', 'Champion']])
  const { total } = scoreKnockoutForUser(pred, actual)
  assert('knockout: predicted SF, actually Champion → 35', 35, total)
}

// Case 4: Team A predicted R16, actually SF → 6 (no top-4 bonus: predicted < SF)
{
  const pred = makePlacements([['A', 'R16']])
  const actual = makePlacements([['A', 'SF']])
  const { total } = scoreKnockoutForUser(pred, actual)
  assert('knockout: predicted R16, actually SF → 6', 6, total)
}

// Case 5: Team not in either bracket → 0
{
  const pred = makePlacements([['A', 'QF']])
  const actual = makePlacements([['B', 'SF']])  // different team
  const { total } = scoreKnockoutForUser(pred, actual)
  assert('knockout: team not in either bracket → 0', 0, total)
}

// Sanity: perTeam and topFourBonus breakdown
{
  const pred = makePlacements([['A', 'Champion'], ['B', 'Final'], ['C', 'SF'], ['D', 'QF']])
  const actual = makePlacements([['A', 'Champion'], ['B', 'Final'], ['C', 'SF'], ['D', 'QF']])
  const result = scoreKnockoutForUser(pred, actual)
  // A: Champion=20 +25, B: Final=15 +25, C: SF=10 +25, D: QF=8 (no bonus)
  assert('knockout perTeam A=20', 20, result.perTeam.get('A') ?? -1)
  assert('knockout perTeam B=15', 15, result.perTeam.get('B') ?? -1)
  assert('knockout perTeam C=10', 10, result.perTeam.get('C') ?? -1)
  assert('knockout perTeam D=8', 8, result.perTeam.get('D') ?? -1)
  assert('knockout basePoints=53', 53, result.basePoints)
  assert('knockout topFourBonus=75', 75, result.topFourBonus)  // A+B+C get bonus (3×25)
  assert('knockout total=128', 128, result.total)
}

// ── Awards ─────────────────────────────────────────────────────────────────────

const fullActual = {
  id: 1,
  golden_boot_player: 'Mbappe',
  golden_boot_goals: 8,
  golden_ball_player: 'Mbappe',
  golden_glove_player: 'Ter Stegen',
  best_young_player: 'Yamal',
}

assert('awards: all correct → 85',
  85,
  scoreAwardsForUser(
    {
      id: 1, user_id: 'u1',
      golden_boot_player: 'Mbappe', golden_boot_goals: 8,
      golden_ball_player: 'Mbappe',
      golden_glove_player: 'Ter Stegen',
      best_young_player: 'Yamal',
    },
    fullActual,
  ).total)

assert('awards: boot player correct only → 20',
  20,
  scoreAwardsForUser(
    {
      id: 1, user_id: 'u1',
      golden_boot_player: 'Mbappe', golden_boot_goals: 5,
      golden_ball_player: 'Ronaldo',
      golden_glove_player: 'Alisson',
      best_young_player: 'Bellingham',
    },
    fullActual,
  ).total)

assert('awards: boot tally correct only → 10',
  10,
  scoreAwardsForUser(
    {
      id: 1, user_id: 'u1',
      golden_boot_player: 'Ronaldo', golden_boot_goals: 8,
      golden_ball_player: 'Ronaldo',
      golden_glove_player: 'Alisson',
      best_young_player: 'Bellingham',
    },
    fullActual,
  ).total)

assert('awards: all wrong → 0',
  0,
  scoreAwardsForUser(
    {
      id: 1, user_id: 'u1',
      golden_boot_player: 'Ronaldo', golden_boot_goals: 5,
      golden_ball_player: 'Ronaldo',
      golden_glove_player: 'Alisson',
      best_young_player: 'Bellingham',
    },
    fullActual,
  ).total)

assert('awards: case-insensitive name match',
  20,
  scoreAwardsForUser(
    {
      id: 1, user_id: 'u1',
      golden_boot_player: '  MBAPPE  ', golden_boot_goals: 5,
      golden_ball_player: null, golden_glove_player: null, best_young_player: null,
    },
    fullActual,
  ).total)

assert('awards: null prediction → 0', 0, scoreAwardsForUser(null, fullActual).total)

// ── Tiebreakers ───────────────────────────────────────────────────────────────

// Helper to create a minimal UserScoreBreakdown
function makeBreakdown(
  total: number,
  tiebreakers: Partial<UserScoreBreakdown['tiebreakers']>,
): UserScoreBreakdown {
  return {
    groupTotal: tiebreakers.groupPoints ?? 0,
    groupPerMatch: new Map(),
    knockoutTotal: 0,
    knockoutPerTeam: new Map(),
    topFourBonus: 0,
    awardsTotal: 0,
    awardsBreakdown: { boot: 0, bootTally: 0, ball: 0, glove: 0, young: 0 },
    total,
    tiebreakers: {
      gold: 0, silver: 0, bronze: 0, goldenBoot: 0, groupPoints: 0, r32Correct: 0,
      ...tiebreakers,
    },
  }
}

// Two users, same total. One has gold=1, the other gold=0.
{
  const ranked = rankUsers([
    { userId: 'no-gold',   breakdown: makeBreakdown(100, { gold: 0 }) },
    { userId: 'has-gold',  breakdown: makeBreakdown(100, { gold: 1 }) },
  ])
  const ranks = Object.fromEntries(ranked.map(r => [r.userId, r.rank]))
  assert('tiebreaker: gold=1 beats gold=0', 1, ranks['has-gold'])
  assert('tiebreaker: gold=0 loses to gold=1', 2, ranks['no-gold'])
}

// Two users equal on all tiebreakers → same rank
{
  const ranked = rankUsers([
    { userId: 'u1', breakdown: makeBreakdown(100, { gold: 1, silver: 1, groupPoints: 50 }) },
    { userId: 'u2', breakdown: makeBreakdown(100, { gold: 1, silver: 1, groupPoints: 50 }) },
  ])
  const ranks = Object.fromEntries(ranked.map(r => [r.userId, r.rank]))
  assert('tiebreaker: fully equal → same rank u1', 1, ranks['u1'])
  assert('tiebreaker: fully equal → same rank u2', 1, ranks['u2'])
}

// Rank numbering: 1, 2, 2, 4 (not 1, 2, 2, 3)
{
  const ranked = rankUsers([
    { userId: 'a', breakdown: makeBreakdown(100, {}) },
    { userId: 'b', breakdown: makeBreakdown(80, {}) },
    { userId: 'c', breakdown: makeBreakdown(80, {}) },
    { userId: 'd', breakdown: makeBreakdown(60, {}) },
  ])
  const ranks = Object.fromEntries(ranked.map(r => [r.userId, r.rank]))
  assert('rank numbering: 1st place rank=1', 1, ranks['a'])
  assert('rank numbering: tied 2nd rank=2', 2, ranks['b'])
  assert('rank numbering: tied 2nd rank=2', 2, ranks['c'])
  assert('rank numbering: 4th place rank=4', 4, ranks['d'])
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log()
console.log(`Results: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
