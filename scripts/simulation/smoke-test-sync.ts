/**
 * Exercises the football-data.org HTTP integration WITHOUT touching the staging DB.
 *
 * Usage:
 *   npm run sim:sync-test              # defaults to PL (Premier League)
 *   npm run sim:sync-test:cl           # Champions League
 *   tsx scripts/simulation/smoke-test-sync.ts CL
 *   tsx scripts/simulation/smoke-test-sync.ts WC   # WC itself (no matches until Jun 2026)
 *
 * Other valid competition codes: CL, PD (La Liga), BL1 (Bundesliga), SA (Serie A)
 */
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env.staging.local') })

// TODO: Ideally this duplicated fetch logic would be extracted from lib/football-data.ts
// into a shared pure function. lib/football-data.ts is NOT modified here to keep
// production behaviour unchanged; its fetchWorldCupMatches call uses the Next.js-specific
// `next: { revalidate: 0 }` option that is incompatible with plain Node.js fetch.

const apiKey = process.env.FOOTBALL_DATA_API_KEY
if (!apiKey || apiKey === 'YOUR_FOOTBALL_DATA_API_KEY') {
  console.error('Error: FOOTBALL_DATA_API_KEY not set in .env.staging.local')
  process.exit(1)
}

const competitionCode = (process.argv[2] ?? 'PL').toUpperCase()

interface FdTeam { id: number; name: string; shortName: string; tla: string }
interface FdScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
  fullTime: { home: number | null; away: number | null }
}
interface FdMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  group: string | null
  homeTeam: FdTeam
  awayTeam: FdTeam
  score: FdScore
}
interface FdResponse { matches: FdMatch[] }

// Mirrors classifyStage from lib/football-data.ts (no import to avoid Next.js types)
function classifyStage(stage: string): string {
  const s = stage.toUpperCase()
  if (s === 'GROUP_STAGE') return 'group'
  if (s === 'ROUND_OF_32' || s === 'LAST_32') return 'r32'
  if (s === 'ROUND_OF_16' || s === 'LAST_16') return 'r16'
  if (s === 'QUARTER_FINALS' || s === 'QUARTER_FINAL') return 'qf'
  if (s === 'SEMI_FINALS' || s === 'SEMI_FINAL') return 'sf'
  if (s === 'THIRD_PLACE' || s === 'THIRD_PLACE_MATCH' || s === 'PLAY_OFF_FOR_THIRD_PLACE') return 'third'
  if (s === 'FINAL') return 'final'
  return stage
}

// Mirrors fdStatusToInternal from lib/sync.ts
function parseStatus(status: string): string {
  if (status === 'FINISHED' || status === 'AWARDED') return 'finished'
  if (status === 'IN_PLAY' || status === 'PAUSED') return 'live'
  return 'scheduled'
}

async function run() {
  const url = `https://api.football-data.org/v4/competitions/${competitionCode}/matches?status=FINISHED`
  console.log(`\nFetching finished matches for competition: ${competitionCode}`)
  console.log(`URL: ${url}\n`)

  const res = await fetch(url, { headers: { 'X-Auth-Token': apiKey as string } })
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${await res.text()}`)
    process.exit(1)
  }

  const body = (await res.json()) as FdResponse
  const matches = body.matches ?? []

  // Take last 10 finished, most recent first
  const finished = matches
    .filter(m => m.status === 'FINISHED' || m.status === 'AWARDED')
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
    .slice(0, 10)

  if (finished.length === 0) {
    console.log('No finished matches found for this competition.')
    return
  }

  // Print table
  const pad = (s: string, n: number) => s.padEnd(n)
  const rpad = (s: string, n: number) => s.padStart(n)
  console.log(
    pad('Date', 12) +
    pad('Home', 20) +
    rpad('Score', 7) +
    '  ' + pad('Away', 20) +
    pad('Stage', 10) +
    'Status'
  )
  console.log('-'.repeat(80))

  for (const m of finished) {
    const date = m.utcDate.slice(0, 10)
    const home = m.score.fullTime.home
    const away = m.score.fullTime.away
    const score = home != null && away != null ? `${home}-${away}` : '?-?'
    const stage = classifyStage(m.stage)
    const status = parseStatus(m.status)

    console.log(
      pad(date, 12) +
      pad(m.homeTeam.name.slice(0, 18), 20) +
      rpad(score, 7) +
      '  ' + pad(m.awayTeam.name.slice(0, 18), 20) +
      pad(stage, 10) +
      status
    )
  }

  console.log('\nIf these scores match real results, the sync HTTP integration is working correctly.')
  console.log(`Parsed ${finished.length} matches. Raw API returned ${matches.length} total for ${competitionCode}.`)
}

run().catch(err => { console.error(err); process.exit(1) })
