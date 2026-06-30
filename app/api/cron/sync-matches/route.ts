import { NextResponse } from 'next/server'
import { bootstrapExternalIds, syncMatchResults } from '@/lib/sync'
import { revalidateMatches, revalidateLeaderboard } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'FOOTBALL_DATA_API_KEY not configured' }, { status: 500 })
  }

  // Map external_id for any knockout fixtures whose teams are now known.
  // Knockout matches start with team-less slots (no external_id); once a round
  // resolves, this links them to the feed so the sync below can auto-set the
  // winner_team_id (and scores) without manual admin entry.
  // Non-fatal: a bootstrap hiccup must never block the result sync.
  let bootstrapped = 0
  let bootstrapError: string | null = null
  let bootstrapWarnings: string[] = []
  try {
    const bootstrap = await bootstrapExternalIds(apiKey)
    bootstrapped = bootstrap.bootstrapped ?? 0
    bootstrapWarnings = bootstrap.warnings
  } catch (err) {
    bootstrapError = err instanceof Error ? err.message : String(err)
    console.error('[cron] bootstrap error (non-fatal):', err)
  }

  try {
    const result = await syncMatchResults(apiKey)
    revalidateMatches()
    revalidateLeaderboard()
    return NextResponse.json({ ...result, bootstrapped, bootstrapError, bootstrapWarnings })
  } catch (err) {
    // Surface the real cause (e.g. "football-data.org returned 400: token invalid")
    // so the failure is diagnosable from the cron response instead of a blank 500.
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron] sync error:', err)
    return NextResponse.json({ error: message, bootstrapError }, { status: 500 })
  }
}
