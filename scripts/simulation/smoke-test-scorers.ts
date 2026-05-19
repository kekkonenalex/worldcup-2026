/**
 * Top-scorer smoke test — no DB required.
 *
 * Fetches real top scorers from football-data.org for a competition and:
 *   1. Prints the current top-scorer standings table.
 *   2. Simulates what award prediction points different users would earn
 *      if the current #1 scorer wins the Golden Boot with their current tally.
 *   3. Calls the production scoreAwardsForUser() function directly so the
 *      scoring logic is exercised against real data.
 *
 * Usage:
 *   npm run sim:scorers-test          # Premier League (default)
 *   npm run sim:scorers-test:cl       # Champions League
 *   tsx scripts/simulation/smoke-test-sync.ts PD   # La Liga
 *
 * Other valid codes: CL, PD, BL1, SA, FL1, DED, PPL
 */
import { config } from 'dotenv'
import path from 'path'
import { scoreAwardsForUser } from '../../lib/scoring.js'

config({ path: path.resolve(process.cwd(), '.env.staging.local') })

const apiKey = process.env.FOOTBALL_DATA_API_KEY
if (!apiKey || apiKey === 'YOUR_FOOTBALL_DATA_API_KEY') {
  console.error('Error: FOOTBALL_DATA_API_KEY not set in .env.staging.local')
  process.exit(1)
}

const competitionCode = (process.argv[2] ?? 'PL').toUpperCase()

// ── football-data.org types ──────────────────────────────────────────────────

interface FdPlayer {
  id: number
  name: string
  firstName: string
  lastName: string
  nationality: string
  position: string | null
}

interface FdScorerEntry {
  player: FdPlayer
  team: { id: number; name: string; shortName: string }
  goals: number
  assists: number | null
  penalties: number | null
  playedMatches: number
}

interface FdScorersResponse {
  count: number
  competition: { id: number; name: string; code: string }
  season: { id: number; startDate: string; endDate: string }
  scorers: FdScorerEntry[]
}

// ── fetch ────────────────────────────────────────────────────────────────────

async function fetchScorers(code: string, limit = 15): Promise<FdScorersResponse> {
  const url = `https://api.football-data.org/v4/competitions/${code}/scorers?limit=${limit}`
  const res = await fetch(url, { headers: { 'X-Auth-Token': apiKey as string } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status} from football-data.org: ${body}`)
  }
  return res.json() as Promise<FdScorersResponse>
}

// ── simulation scenarios ─────────────────────────────────────────────────────

function buildScenarios(top: FdScorerEntry, second: FdScorerEntry | undefined) {
  // Actual award result based on current leader
  const actual = {
    id: 1,
    golden_boot_player: top.player.name,
    golden_boot_goals: top.goals,
    golden_ball_player: top.player.name,   // assume same player for demo
    golden_glove_player: null,
    best_young_player: null,
  }

  return [
    {
      label: 'Perfect pick',
      desc: `Correct player + correct goal tally (${top.goals} goals)`,
      prediction: {
        id: 1, user_id: 'demo',
        golden_boot_player: top.player.name,
        golden_boot_goals: top.goals,
        golden_ball_player: top.player.name,
        golden_glove_player: null,
        best_young_player: null,
      },
    },
    {
      label: 'Right player, wrong tally',
      desc: `Correct player, predicted ${top.goals - 2} goals instead of ${top.goals}`,
      prediction: {
        id: 2, user_id: 'demo',
        golden_boot_player: top.player.name,
        golden_boot_goals: top.goals - 2,
        golden_ball_player: top.player.name,
        golden_glove_player: null,
        best_young_player: null,
      },
    },
    {
      label: 'Wrong player (2nd place)',
      desc: second
        ? `Predicted ${second.player.name} (${second.goals} goals) instead`
        : 'No 2nd place data',
      prediction: {
        id: 3, user_id: 'demo',
        golden_boot_player: second?.player.name ?? 'Unknown Player',
        golden_boot_goals: second?.goals ?? 0,
        golden_ball_player: null,
        golden_glove_player: null,
        best_young_player: null,
      },
    },
    {
      label: 'Completely wrong',
      desc: 'Random player, random tally',
      prediction: {
        id: 4, user_id: 'demo',
        golden_boot_player: 'No One Famous',
        golden_boot_goals: 3,
        golden_ball_player: null,
        golden_glove_player: null,
        best_young_player: null,
      },
    },
  ].map(s => ({
    ...s,
    score: scoreAwardsForUser(s.prediction, actual),
    actual,
  }))
}

// ── display helpers ──────────────────────────────────────────────────────────

const pad  = (s: string, n: number) => s.slice(0, n).padEnd(n)
const rpad = (s: string, n: number) => s.padStart(n)

// ── main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\nFetching top scorers for competition: ${competitionCode}\n`)

  const data = await fetchScorers(competitionCode)

  if (!data.scorers || data.scorers.length === 0) {
    console.log('No scorer data returned — competition may not have started yet.')
    return
  }

  const { competition, season, scorers } = data

  console.log(`${competition.name} — ${season.startDate.slice(0, 4)}/${season.endDate.slice(0, 4)} season`)
  console.log(`${scorers.length} scorers returned\n`)

  // ── Table 1: top scorers ──────────────────────────────────────────────────
  console.log(
    rpad('#', 3) + '  ' +
    pad('Player', 28) +
    pad('Team', 24) +
    rpad('Goals', 7) +
    rpad('Assists', 9) +
    rpad('Pen', 5) +
    rpad('Pld', 5)
  )
  console.log('-'.repeat(80))

  scorers.forEach((s, i) => {
    console.log(
      rpad(String(i + 1), 3) + '  ' +
      pad(s.player.name, 28) +
      pad(s.team.shortName ?? s.team.name, 24) +
      rpad(String(s.goals), 7) +
      rpad(String(s.assists ?? '—'), 9) +
      rpad(String(s.penalties ?? '—'), 5) +
      rpad(String(s.playedMatches ?? '—'), 5)
    )
  })

  const top = scorers[0]
  const second = scorers[1]

  // ── Table 2: award scoring scenarios ────────────────────────────────────
  console.log('\n')
  console.log('Award scoring simulation')
  console.log(`Assumes current leader (${top.player.name}, ${top.goals} goals) wins the Golden Boot.`)
  console.log(`Also assumes same player wins Golden Ball (simplified demo).\n`)

  console.log(
    pad('Scenario', 30) +
    rpad('Boot', 6) +
    rpad('Tally', 7) +
    rpad('Ball', 6) +
    rpad('Total', 7) +
    '  Description'
  )
  console.log('-'.repeat(95))

  const scenarios = buildScenarios(top, second)

  for (const s of scenarios) {
    const { score } = s
    console.log(
      pad(s.label, 30) +
      rpad(String(score.boot), 6) +
      rpad(String(score.bootTally), 7) +
      rpad(String(score.ball), 6) +
      rpad(String(score.total), 7) +
      `  ${s.desc}`
    )
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n')
  console.log('Scoring rules (from lib/scoring.ts):')
  console.log('  Golden Boot player name match (case-insensitive): +20 pts')
  console.log('  Golden Boot exact goal tally:                     +10 pts')
  console.log('  Golden Ball player name match:                    +20 pts')
  console.log('  Golden Glove player name match:                   +20 pts')
  console.log('  Best Young Player name match:                     +15 pts')
  console.log('  Max possible awards score:                        +85 pts')
  console.log('\nAll scoring logic invoked via production scoreAwardsForUser() in lib/scoring.ts.')
  console.log('No DB writes. Safe to run at any time.\n')
}

run().catch(err => { console.error(err.message); process.exit(1) })
