/**
 * End-to-end scoring test against the staging DB.
 * Requires: npm run sim:reset && npm run sim:seed
 *
 * What this does:
 *   1. Verifies the seed has been run (aborts if no teams).
 *   2. Injects known match results + award results into staging.
 *   3. Calls getAllUserScores() from lib/scoring-server.ts (production code, read-only).
 *   4. Compares actual scores to hand-calculated EXPECTED_SCORES.
 *   5. Prints a PASS/FAIL table and exits 1 if any FAIL.
 *
 * Expected score derivation (all calculations in SIMULATION.md):
 *
 *   Group results:
 *     M1: Alpha 2-1 Bravo   M2: Alpha 3-0 Charlie  M3: Alpha 1-1 Delta
 *     M4: Bravo 2-2 Charlie  M5: Bravo 1-0 Delta    M6: Charlie 2-1 Delta
 *   Knockout results:
 *     M97 (sf): Alpha 2-0 Delta   → winner=Alpha
 *     M98 (sf): Bravo 1-0 Charlie → winner=Bravo
 *     M104(fin): Alpha 2-1 Bravo  → winner=Alpha (Champion)
 *   Awards:
 *     golden_boot: "Striker Alpha" (5 goals), golden_ball: "Alpha Star",
 *     golden_glove: "Goalkeeper G", best_young: "Young P"
 *
 *   Scoring rules (from lib/scoring.ts):
 *     Group:   6 exact | 5 same GD | 3+bonus correct outcome
 *     Knockout: cumulative per round reached: R32=6, R16=8, QF=10, SF=15, Final=20, Champion=+20
 *               (R32 qualification points only resolve once all 72 group matches are
 *               finished; in this 6-match mini-tournament the R32 tier is still folded
 *               into the cumulative sum for any team that reaches a deeper round.)
 *     Top-4:   +25 per exact position match (Champion only reachable in mini-tourney)
 *     Awards:  boot=20, bootTally=10, ball=20, glove=20, young=15
 */
import { stagingDb } from './lib/staging-client.js'
import { getAllUserScores } from '../../lib/scoring-server.js'

// ── Expected scores (calculated by hand) ────────────────────────────────────
const EXPECTED_SCORES: Record<string, {
  group: number; knockout: number; top4: number; awards: number; total: number
}> = {
  // Alice: all group exact (36) + Alpha Champion (79) + Bravo SF (39) + Champion bonus (25) + all awards (85)
  'alice': { group: 36, knockout: 118, top4: 25, awards: 85, total: 264 },
  // Bob: GD-correct groups (29) + Alpha Champion (79) + no Bravo pick (0) + Champion bonus (25) + ball+young (35)
  'bob':   { group: 29, knockout: 79, top4: 25, awards: 35, total: 168 },
  // Charlie user: one tally bonus (1) + Bravo capped at SF (39) + no top4 + no awards
  'charlie': { group: 1, knockout: 39, top4: 0, awards: 0, total: 40 },
}

async function run() {
  const db = stagingDb

  // ── 1. Verify seed ───────────────────────────────────────────────────────────
  const { count: teamCount } = await db.from('teams').select('*', { count: 'exact', head: true })
  if (!teamCount || teamCount === 0) {
    console.error('No teams found. Run: npm run sim:reset && npm run sim:seed')
    process.exit(1)
  }

  // ── 2. Look up team IDs ──────────────────────────────────────────────────────
  const { data: teams } = await db.from('teams').select('id, short_code')
  const byCode = Object.fromEntries((teams ?? []).map(t => [t.short_code as string, t.id as number]))
  const ALP = byCode['ALP'], BRV = byCode['BRV'], CHA = byCode['CHA'], DEL = byCode['DEL']

  if (!ALP || !BRV || !CHA || !DEL) {
    console.error('Could not find all test teams. Was the seed run successfully?')
    process.exit(1)
  }

  // ── 3. Look up match IDs ─────────────────────────────────────────────────────
  const { data: matches } = await db.from('matches').select('id, match_number')
  const matchById = Object.fromEntries((matches ?? []).map(m => [m.match_number as number, m.id as number]))

  const ids = [1, 2, 3, 4, 5, 6, 97, 98, 104].map(n => matchById[n])
  if (ids.some(id => id == null)) {
    console.error('Could not find all test matches. Was the seed run successfully?')
    process.exit(1)
  }
  const [m1, m2, m3, m4, m5, m6, m97, m98, m104] = ids

  // ── 4. Inject match results ──────────────────────────────────────────────────
  console.log('Injecting match results...')

  const matchUpdates = [
    { id: m1,   home_score: 2, away_score: 1, winner_team_id: null,  status: 'finished' as const },
    { id: m2,   home_score: 3, away_score: 0, winner_team_id: null,  status: 'finished' as const },
    { id: m3,   home_score: 1, away_score: 1, winner_team_id: null,  status: 'finished' as const },
    { id: m4,   home_score: 2, away_score: 2, winner_team_id: null,  status: 'finished' as const },
    { id: m5,   home_score: 1, away_score: 0, winner_team_id: null,  status: 'finished' as const },
    { id: m6,   home_score: 2, away_score: 1, winner_team_id: null,  status: 'finished' as const },
    { id: m97,  home_score: 2, away_score: 0, winner_team_id: ALP,   status: 'finished' as const },
    { id: m98,  home_score: 1, away_score: 0, winner_team_id: BRV,   status: 'finished' as const },
    { id: m104, home_score: 2, away_score: 1, winner_team_id: ALP,   status: 'finished' as const,
      home_team_id: ALP, away_team_id: BRV },
  ]

  for (const { id, ...patch } of matchUpdates) {
    const { error } = await db.from('matches').update(patch as never).eq('id', id)
    if (error) throw new Error(`Update match ${id}: ${error.message}`)
  }

  // ── 5. Inject award results ──────────────────────────────────────────────────
  const { error: arErr } = await db.from('award_results').upsert({
    id: 1,
    golden_boot_player:  'Striker Alpha',
    golden_boot_goals:   5,
    golden_ball_player:  'Alpha Star',
    golden_glove_player: 'Goalkeeper G',
    best_young_player:   'Young P',
  })
  if (arErr) throw new Error(`Upsert award_results: ${arErr.message}`)

  console.log('Results injected. Running scoring engine...\n')

  // ── 6. Run scoring engine (production code, read-only) ───────────────────────
  // getAllUserScores accepts any SupabaseClient — no production coupling issue here.
  // lib/scoring-server.ts is imported directly; no refactor needed.
  const scores = await getAllUserScores(db)

  // ── 7. Compare to expected ───────────────────────────────────────────────────
  const padR = (s: string, n: number) => s.padEnd(n)
  const padL = (s: string, n: number) => s.padStart(n)

  console.log(
    padR('User', 14) + padL('Exp', 6) + padL('Act', 6) +
    padL('Group', 8) + padL('KO', 6) + padL('Top4', 7) + padL('Awds', 7) +
    '  Status'
  )
  console.log('-'.repeat(70))

  let anyFail = false

  for (const entry of scores) {
    const name = entry.displayName.toLowerCase()
    const expected = EXPECTED_SCORES[name]
    if (!expected) {
      console.log(`${padR(entry.displayName, 14)} (no expected score defined, skipping)`)
      continue
    }

    const bd = entry.breakdown
    const actual = {
      group: bd.groupTotal,
      knockout: bd.knockoutTotal,
      top4: bd.topFourBonus,
      awards: bd.awardsTotal,
      total: bd.total,
    }

    const totalPass = actual.total === expected.total
    const groupPass = actual.group === expected.group
    const koPass    = actual.knockout === expected.knockout
    const top4Pass  = actual.top4 === expected.top4
    const awdPass   = actual.awards === expected.awards

    const pass = totalPass && groupPass && koPass && top4Pass && awdPass
    if (!pass) anyFail = true

    const status = pass ? 'PASS' : [
      !groupPass ? `group ${actual.group}≠${expected.group}` : '',
      !koPass    ? `ko ${actual.knockout}≠${expected.knockout}` : '',
      !top4Pass  ? `top4 ${actual.top4}≠${expected.top4}` : '',
      !awdPass   ? `awards ${actual.awards}≠${expected.awards}` : '',
    ].filter(Boolean).join(', ')

    console.log(
      padR(entry.displayName, 14) +
      padL(String(expected.total), 6) +
      padL(String(actual.total), 6) +
      padL(String(actual.group), 8) +
      padL(String(actual.knockout), 6) +
      padL(String(actual.top4), 7) +
      padL(String(actual.awards), 7) +
      `  ${pass ? '✓ PASS' : `✗ FAIL (${status})`}`
    )
  }

  console.log('')
  if (anyFail) {
    console.error('SCORING TEST FAILED. See deltas above.')
    process.exit(1)
  } else {
    console.log('All scoring tests PASSED.')
  }
}

run().catch(err => { console.error(err); process.exit(1) })
