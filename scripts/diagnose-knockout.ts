/**
 * Phase 34 — READ-ONLY production diagnostic for knockout (R32) scoring.
 *
 * Connects to PRODUCTION using .env.local (NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY) and ONLY reads — it never writes, updates or deletes.
 *
 * Run:  npm run diagnose:knockout
 *
 * Answers the two data gates behind missing knockout scoring:
 *   (a) R32 qualification resolves only when ALL 72 group matches are 'finished'.
 *   (b) R16+ advancement resolves only when a knockout match has winner_team_id set.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'
import type { Match, Team } from '../types/database'
import { computeQualifiedTeams } from '../lib/knockout-qualification'
import { getAllUserScores } from '../lib/scoring-server'

config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error('Production env vars missing. Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

// Read-only service client. No persistSession — this is a one-shot script.
const db = createClient(url, serviceKey, { auth: { persistSession: false } })

async function main() {
  console.log('============================================================')
  console.log('KNOCKOUT SCORING — PRODUCTION DATA DIAGNOSIS (read-only)')
  console.log(`Target: ${url}`)
  console.log('============================================================')

  // ── Fetch all matches + teams ──────────────────────────────────────────────
  const { data: rawMatches, error: mErr } = await db
    .from('matches')
    .select('*')
    .order('match_number', { ascending: true })
  if (mErr) throw new Error(`matches read failed: ${mErr.message}`)
  const matches = (rawMatches ?? []) as unknown as Match[]

  const { data: rawTeams, error: tErr } = await db.from('teams').select('*')
  if (tErr) throw new Error(`teams read failed: ${tErr.message}`)
  const teams = (rawTeams ?? []) as unknown as Team[]
  const teamName = (id: number | null) =>
    id == null ? '—' : (teams.find(t => t.id === id)?.short_code ?? `#${id}`)

  const groupMatches = matches.filter(m => m.match_number <= 72)
  const knockoutMatches = matches.filter(m => m.match_number >= 73)

  // ── 1. Group match status breakdown ────────────────────────────────────────
  console.log('\n--- 1. GROUP MATCHES (match_number 1–72) by status ---')
  const byStatus = new Map<string, number>()
  for (const m of groupMatches) byStatus.set(m.status, (byStatus.get(m.status) ?? 0) + 1)
  for (const [status, count] of byStatus) console.log(`  ${status.padEnd(10)} ${count}`)
  console.log(`  TOTAL group matches present: ${groupMatches.length}/72`)
  const notFinished = groupMatches.filter(m => m.status !== 'finished')
  if (notFinished.length > 0) {
    console.log(`  ⚠ ${notFinished.length} group match(es) NOT finished — R32 points will NOT resolve:`)
    console.log('    match_numbers: ' + notFinished.map(m => m.match_number).join(', '))
  } else {
    console.log('  ✓ All present group matches are finished.')
  }

  // ── 2. Knockout matches state ──────────────────────────────────────────────
  console.log('\n--- 2. KNOCKOUT MATCHES (match_number ≥ 73) ---')
  console.log('  mNo  stage        home  away  score   status     winner')
  for (const m of knockoutMatches) {
    const score = m.home_score != null && m.away_score != null ? `${m.home_score}-${m.away_score}` : ' - '
    console.log(
      '  ' +
        String(m.match_number).padEnd(5) +
        String(m.stage).padEnd(13) +
        teamName(m.home_team_id).padEnd(6) +
        teamName(m.away_team_id).padEnd(6) +
        score.padEnd(8) +
        String(m.status).padEnd(11) +
        teamName(m.winner_team_id),
    )
  }
  const playedNoWinner = knockoutMatches.filter(
    m => (m.status === 'finished' || (m.home_score != null && m.away_score != null)) && m.winner_team_id == null,
  )
  if (playedNoWinner.length > 0) {
    console.log(`  ⚠ ${playedNoWinner.length} played knockout match(es) have NO winner_team_id — advancement points blocked:`)
    console.log('    match_numbers: ' + playedNoWinner.map(m => m.match_number).join(', '))
  }

  // ── 3. computeQualifiedTeams against real group data ───────────────────────
  console.log('\n--- 3. computeQualifiedTeams(groupMatches, teams) ---')
  const qualified = computeQualifiedTeams(groupMatches, teams)
  console.log(`  isComplete:      ${qualified.isComplete}`)
  console.log(`  allR32 count:    ${qualified.allR32.length} (expect 32 when complete)`)
  console.log(`  autoQualified:   ${qualified.autoQualified.length}`)
  console.log(`  bestThirds:      ${qualified.bestThirds.length}`)
  if (qualified.warnings.length) {
    console.log('  warnings:')
    for (const w of qualified.warnings) console.log('    - ' + w)
  } else {
    console.log('  warnings:        (none)')
  }
  if (qualified.isComplete) {
    console.log('  R32 teams: ' + qualified.allR32.map(teamName).join(', '))
  }

  // ── 4. Real scoring for a user who has knockout predictions ────────────────
  console.log('\n--- 4. SAMPLE USER knockout breakdown (real scoring path) ---')
  const { data: koUsers } = await db
    .from('knockout_predictions')
    .select('user_id')
    .limit(1000)
  const sampleUserId = (koUsers as { user_id: string }[] | null)?.[0]?.user_id ?? null
  if (!sampleUserId) {
    console.log('  No users have knockout predictions yet.')
  } else {
    const allScores = await getAllUserScores(db)
    const entry = allScores.find(s => s.userId === sampleUserId)
    if (!entry) {
      console.log(`  Could not compute score for user ${sampleUserId}.`)
    } else {
      console.log(`  user: ${entry.displayName} (${sampleUserId})`)
      console.log(`  knockoutTotal: ${entry.breakdown.knockoutTotal}`)
      console.log(`  knockoutR32Resolved: ${entry.breakdown.knockoutR32Resolved}`)
      for (const round of entry.breakdown.knockoutDetail) {
        if (round.teams.length === 0) continue
        const summary = round.teams
          .map(t => `${t.shortCode}${t.status === 'advanced' ? '✅+' + t.points : t.status === 'missed' ? '❌' : '⬜'}`)
          .join(' ')
        console.log(`    ${round.round.padEnd(6)} (+${round.pointValue}) ${summary}`)
      }
    }
  }

  console.log('\n============================================================')
  console.log('Diagnosis complete (no data was modified).')
  console.log('============================================================')
}

main().catch(err => {
  console.error('Diagnostic failed:', err)
  process.exit(1)
})
