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

  try {
    // Map external_id for any knockout fixtures whose teams are now known.
    // Knockout matches start with team-less slots (no external_id); once a round
    // resolves, this links them to the feed so the sync below can auto-set the
    // winner_team_id (and scores) without manual admin entry.
    const bootstrap = await bootstrapExternalIds(apiKey)
    const result = await syncMatchResults(apiKey)
    revalidateMatches()
    revalidateLeaderboard()
    return NextResponse.json({ bootstrapped: bootstrap.bootstrapped, ...result })
  } catch (err) {
    console.error('[cron] sync error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
