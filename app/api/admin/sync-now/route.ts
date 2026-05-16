import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { syncMatchResults } from '@/lib/sync'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await requireAdmin()
  } catch {
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
    console.error('[admin] sync error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
