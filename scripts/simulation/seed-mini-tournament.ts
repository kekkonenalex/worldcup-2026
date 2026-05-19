/**
 * Seeds the staging DB with a controlled 4-team mini-tournament.
 *
 * Teams: Alpha, Bravo, Charlie, Delta (group A)
 * Matches:
 *   - match_number 1-6: group stage round-robin
 *   - match_number 97-98: semi-finals  (range 97-100 = 'SF' in scoring engine)
 *   - match_number 104: final          (range 104     = 'Champion' in scoring engine)
 *
 * Users: alice@test.sim, bob@test.sim, charlie@test.sim
 *
 * Predictions are hand-crafted to produce KNOWN expected scores when
 * combined with the actual results injected in run-scoring-test.ts.
 * See SIMULATION.md for the full scoring breakdown.
 */
import { stagingDb } from './lib/staging-client.js'

async function seed() {
  const db = stagingDb

  // ── 1. Insert teams ──────────────────────────────────────────────────────────
  const { data: teamsInserted, error: teamsErr } = await db
    .from('teams')
    .insert([
      { name: 'Team Alpha',   short_code: 'ALP', group_letter: 'A', flag_emoji: '🔴' },
      { name: 'Team Bravo',   short_code: 'BRV', group_letter: 'A', flag_emoji: '🔵' },
      { name: 'Team Charlie', short_code: 'CHA', group_letter: 'A', flag_emoji: '🟢' },
      { name: 'Team Delta',   short_code: 'DEL', group_letter: 'A', flag_emoji: '🟡' },
    ])
    .select('id, name, short_code')

  if (teamsErr || !teamsInserted) throw new Error(`Insert teams: ${teamsErr?.message}`)

  const byCode = Object.fromEntries(teamsInserted.map(t => [t.short_code, t.id])) as Record<string, number>
  const ALP = byCode['ALP'], BRV = byCode['BRV'], CHA = byCode['CHA'], DEL = byCode['DEL']
  console.log(`Teams: ALP=${ALP} BRV=${BRV} CHA=${CHA} DEL=${DEL}`)

  // ── 2. Insert matches ────────────────────────────────────────────────────────
  // Group matches (match_number ≤ 72 → treated as group stage by scoring engine)
  // Knockout matches use match_numbers that sit in the engine's range definitions:
  //   97–100 → 'SF', 104 → 'Champion'
  const { data: matchesInserted, error: matchesErr } = await db
    .from('matches')
    .insert([
      // Group stage
      { match_number: 1, stage: 'group', group_letter: 'A', home_team_id: ALP, away_team_id: BRV, status: 'scheduled' },
      { match_number: 2, stage: 'group', group_letter: 'A', home_team_id: ALP, away_team_id: CHA, status: 'scheduled' },
      { match_number: 3, stage: 'group', group_letter: 'A', home_team_id: ALP, away_team_id: DEL, status: 'scheduled' },
      { match_number: 4, stage: 'group', group_letter: 'A', home_team_id: BRV, away_team_id: CHA, status: 'scheduled' },
      { match_number: 5, stage: 'group', group_letter: 'A', home_team_id: BRV, away_team_id: DEL, status: 'scheduled' },
      { match_number: 6, stage: 'group', group_letter: 'A', home_team_id: CHA, away_team_id: DEL, status: 'scheduled' },
      // Semi-finals (match_number 97–100 → 'SF' placement in scoring engine)
      { match_number: 97, stage: 'sf', home_team_id: ALP, away_team_id: DEL, status: 'scheduled' },
      { match_number: 98, stage: 'sf', home_team_id: BRV, away_team_id: CHA, status: 'scheduled' },
      // Final (match_number 104 → 'Champion' placement in scoring engine)
      { match_number: 104, stage: 'final', home_team_id: ALP, away_team_id: BRV, status: 'scheduled' },
    ])
    .select('id, match_number')

  if (matchesErr || !matchesInserted) throw new Error(`Insert matches: ${matchesErr?.message}`)

  const matchIdByNum = Object.fromEntries(matchesInserted.map(m => [m.match_number, m.id])) as Record<number, number>
  const [m1, m2, m3, m4, m5, m6] = [1, 2, 3, 4, 5, 6].map(n => matchIdByNum[n])
  console.log(`Group match IDs: M1=${m1} M2=${m2} M3=${m3} M4=${m4} M5=${m5} M6=${m6}`)
  console.log(`Knockout match IDs: M97=${matchIdByNum[97]} M98=${matchIdByNum[98]} M104=${matchIdByNum[104]}`)

  // ── 3. Create test users ─────────────────────────────────────────────────────
  const testEmails = ['alice@test.sim', 'bob@test.sim', 'charlie@test.sim']
  const userIds: Record<string, string> = {}

  for (const email of testEmails) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: 'sim-password-123',
      email_confirm: true,
    })
    if (error || !data.user) throw new Error(`createUser(${email}): ${error?.message}`)
    userIds[email] = data.user.id
    console.log(`  Created user: ${email} → ${data.user.id}`)
  }

  const alice = userIds['alice@test.sim']
  const bob   = userIds['bob@test.sim']
  const charlie = userIds['charlie@test.sim']

  // ── 4. Insert group predictions ──────────────────────────────────────────────
  //
  // Actual results (injected in run-scoring-test.ts):
  //   M1: Alpha 2-1 Bravo   M2: Alpha 3-0 Charlie  M3: Alpha 1-1 Delta
  //   M4: Bravo 2-2 Charlie  M5: Bravo 1-0 Delta    M6: Charlie 2-1 Delta
  //   M97: Alpha 2-0 Delta (winner=Alpha)
  //   M98: Bravo 1-0 Charlie (winner=Bravo)
  //   M104: Alpha 2-1 Bravo (winner=Alpha → Champion)
  //
  // Alice: all exact → 6×6 = 36 group pts
  // Bob:   GD-correct on most → 29 group pts
  // Charlie: mostly wrong → 1 group pt
  const { error: gpErr } = await db.from('group_predictions').insert([
    // Alice — exact matches
    { user_id: alice, match_id: m1, predicted_home_score: 2, predicted_away_score: 1 },
    { user_id: alice, match_id: m2, predicted_home_score: 3, predicted_away_score: 0 },
    { user_id: alice, match_id: m3, predicted_home_score: 1, predicted_away_score: 1 },
    { user_id: alice, match_id: m4, predicted_home_score: 2, predicted_away_score: 2 },
    { user_id: alice, match_id: m5, predicted_home_score: 1, predicted_away_score: 0 },
    { user_id: alice, match_id: m6, predicted_home_score: 2, predicted_away_score: 1 },
    // Bob — correct outcomes, same GD (mostly 5pts each)
    { user_id: bob, match_id: m1, predicted_home_score: 1, predicted_away_score: 0 }, // Alpha win, GD=1=actual → 5
    { user_id: bob, match_id: m2, predicted_home_score: 2, predicted_away_score: 0 }, // Alpha win, GD=2≠3, away=0 match → 3+1=4
    { user_id: bob, match_id: m3, predicted_home_score: 0, predicted_away_score: 0 }, // draw, GD=0=0 → 5
    { user_id: bob, match_id: m4, predicted_home_score: 1, predicted_away_score: 1 }, // draw, GD=0=0 → 5
    { user_id: bob, match_id: m5, predicted_home_score: 2, predicted_away_score: 1 }, // Bravo win, GD=1=1 → 5
    { user_id: bob, match_id: m6, predicted_home_score: 1, predicted_away_score: 0 }, // Charlie win, GD=1=1 → 5
    // Charlie — mostly wrong outcomes
    { user_id: charlie, match_id: m1, predicted_home_score: 0, predicted_away_score: 1 }, // Bravo win (wrong); away=1=actual.away → 0+1=1
    { user_id: charlie, match_id: m2, predicted_home_score: 1, predicted_away_score: 2 }, // Charlie win (wrong) → 0
    { user_id: charlie, match_id: m3, predicted_home_score: 2, predicted_away_score: 0 }, // Alpha win (wrong, actual draw) → 0
    { user_id: charlie, match_id: m4, predicted_home_score: 1, predicted_away_score: 0 }, // Bravo win (wrong, actual draw) → 0
    { user_id: charlie, match_id: m5, predicted_home_score: 0, predicted_away_score: 1 }, // Delta win (wrong) → 0
    { user_id: charlie, match_id: m6, predicted_home_score: 0, predicted_away_score: 2 }, // Delta win (wrong) → 0
  ])
  if (gpErr) throw new Error(`Insert group_predictions: ${gpErr.message}`)

  // ── 5. Insert knockout predictions ──────────────────────────────────────────
  //
  // Scoring engine: bracket_position 97-100 → 'SF', bracket_position 104 → 'Champion'
  // Cumulative: SF = R16+QF+SF = 6+8+10 = 24, Champion = 6+8+10+15+20 = 59
  //
  // Alice: picks Alpha as Champion (bp=104), Bravo as SF winner (bp=98) → 59+24 = 83 knockout
  // Bob:   picks Alpha as Champion (bp=104), Charlie as SF winner (bp=98) → 59+0 = 59 knockout
  // Charlie user: picks Bravo as Champion (bp=104), Delta as SF1 (bp=97), Charlie as SF2 (bp=98) → 24 knockout
  const { error: kpErr } = await db.from('knockout_predictions').insert([
    // Alice
    { user_id: alice, bracket_position: 97,  predicted_team_id: ALP }, // Alpha wins SF1 ✓
    { user_id: alice, bracket_position: 98,  predicted_team_id: BRV }, // Bravo wins SF2 ✓
    { user_id: alice, bracket_position: 104, predicted_team_id: ALP }, // Alpha is Champion ✓
    // Bob
    { user_id: bob,   bracket_position: 97,  predicted_team_id: ALP }, // Alpha wins SF1 ✓
    { user_id: bob,   bracket_position: 98,  predicted_team_id: CHA }, // Charlie wins SF2 ✗ (Bravo wins)
    { user_id: bob,   bracket_position: 104, predicted_team_id: ALP }, // Alpha is Champion ✓
    // Charlie user
    { user_id: charlie, bracket_position: 97,  predicted_team_id: DEL }, // Delta wins SF1 ✗
    { user_id: charlie, bracket_position: 98,  predicted_team_id: CHA }, // Charlie wins SF2 ✗
    { user_id: charlie, bracket_position: 104, predicted_team_id: BRV }, // Bravo is Champion ✗ (Alpha wins)
  ])
  if (kpErr) throw new Error(`Insert knockout_predictions: ${kpErr.message}`)

  // ── 6. Insert award predictions ──────────────────────────────────────────────
  //
  // Actual awards (injected in run-scoring-test.ts):
  //   golden_boot_player: "Striker Alpha", goals: 5
  //   golden_ball_player: "Alpha Star"
  //   golden_glove_player: "Goalkeeper G"
  //   best_young_player: "Young P"
  //
  // Alice: all correct → 20+10+20+20+15 = 85 award pts
  // Bob:   ball+young correct → 0+0+20+0+15 = 35 award pts
  // Charlie user: all wrong → 0 award pts
  const { error: apErr } = await db.from('award_predictions').insert([
    {
      user_id: alice,
      golden_boot_player:  'Striker Alpha',
      golden_boot_goals:   5,
      golden_ball_player:  'Alpha Star',
      golden_glove_player: 'Goalkeeper G',
      best_young_player:   'Young P',
    },
    {
      user_id: bob,
      golden_boot_player:  'Wrong Player',
      golden_boot_goals:   3,
      golden_ball_player:  'Alpha Star',
      golden_glove_player: 'Wrong Keeper',
      best_young_player:   'Young P',
    },
    {
      user_id: charlie,
      golden_boot_player:  'Wrong Player',
      golden_boot_goals:   7,
      golden_ball_player:  'Wrong Ball',
      golden_glove_player: 'Wrong Keeper',
      best_young_player:   'Wrong Youth',
    },
  ])
  if (apErr) throw new Error(`Insert award_predictions: ${apErr.message}`)

  // ── Summary ──────────────────────────────────────────────────────────────────
  const [
    { count: teamCount },
    { count: matchCount },
    { count: gpCount },
    { count: kpCount },
    { count: apCount },
  ] = await Promise.all([
    db.from('teams').select('*', { count: 'exact', head: true }),
    db.from('matches').select('*', { count: 'exact', head: true }),
    db.from('group_predictions').select('*', { count: 'exact', head: true }),
    db.from('knockout_predictions').select('*', { count: 'exact', head: true }),
    db.from('award_predictions').select('*', { count: 'exact', head: true }),
  ])

  console.log('\n=== Seed complete ===')
  console.log(`  teams:                ${teamCount}`)
  console.log(`  matches:              ${matchCount}`)
  console.log(`  users:                ${testEmails.length}`)
  console.log(`  group predictions:    ${gpCount}`)
  console.log(`  knockout predictions: ${kpCount}`)
  console.log(`  award predictions:    ${apCount}`)
  console.log('\nRun npm run sim:score-test to inject results and verify scoring.')
}

seed().catch(err => { console.error(err); process.exit(1) })
