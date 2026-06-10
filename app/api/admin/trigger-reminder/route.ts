import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Admin-only proxy: checks session + is_admin flag, then calls the cron
// route server-side with CRON_SECRET so the secret is never exposed to the browser.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rows } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .limit(1)

  if (!(rows as Array<{ is_admin: boolean }> | null)?.[0]?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const secret = process.env.CRON_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  // Target our own origin (derived from the incoming request) rather than a static
  // env URL — otherwise a production NEXT_PUBLIC_SITE_URL would make local sends call
  // the production cron route with the local secret and fail auth.
  const siteUrl = request.nextUrl.origin

  // force=1 bypasses the June-9 send window guard so admin-initiated sends always
  // fire (still subject to the past-deadline guard inside the cron route).
  const res = await fetch(`${siteUrl}/api/cron/send-reminder?force=1`, {
    headers: { Authorization: `Bearer ${secret}` },
  })

  const data = await res.json() as unknown
  return NextResponse.json(data, { status: res.status })
}
