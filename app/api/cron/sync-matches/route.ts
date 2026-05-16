import { NextResponse } from 'next/server'
import { syncMatchResults } from '@/lib/sync'

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
    const result = await syncMatchResults(apiKey)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron] sync error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
