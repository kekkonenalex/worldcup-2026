import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { buildReminderEmail } from '@/lib/email/reminder-html'
import { PREDICTION_DEADLINE } from '@/lib/config'

// Only sends within a 6-hour window around the intended 09:00 UTC fire time on June 9, 2026.
// Outside this window the route returns { skipped: true } — safe to leave the cron entry
// in vercel.json after June 2026; it will be a no-op in future years.
// The window guard is bypassed when ?force=1 is passed (admin-initiated sends).
const WINDOW_START = new Date('2026-06-09T07:00:00Z')
const WINDOW_END   = new Date('2026-06-09T13:00:00Z')

const SITE_URL = 'https://www.wc2026-predictions.site'

// Group complete = 72 predictions (72 group-stage matches in 48-team WC)
const GROUP_COMPLETE_COUNT    = 72
// Knockout complete = 32 predictions (bracket positions 73–104)
const KNOCKOUT_COMPLETE_COUNT = 32
// Awards complete = 5 fields filled
const AWARDS_COMPLETE_COUNT   = 5

export async function GET(request: NextRequest) {
  // ── A. Security guard ───────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('Authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── B. Force flag ───────────────────────────────────────────────────────────
  const url = new URL(request.url)
  const force = url.searchParams.get('force') === '1'

  const now      = new Date()
  const deadline = new Date(PREDICTION_DEADLINE)

  // ── C. Date guard (bypassed by ?force=1, so Vercel's scheduled cron is still protected) ─
  if (!force) {
    if (now < WINDOW_START || now > WINDOW_END) {
      return NextResponse.json({
        skipped: true,
        reason: 'Outside send window',
        now: now.toISOString(),
        window: { start: WINDOW_START.toISOString(), end: WINDOW_END.toISOString() },
      })
    }
  }

  // ── D. Past-deadline guard (cannot be bypassed by force) ─────────────────────
  if (now > deadline) {
    return NextResponse.json({
      skipped: true,
      reason: 'Deadline has already passed',
      deadline: deadline.toISOString(),
    })
  }

  // ── E. Main logic ───────────────────────────────────────────────────────────
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
    const resendKey   = process.env.RESEND_API_KEY

    if (!supabaseUrl || !serviceKey || !resendKey) {
      return NextResponse.json({ error: 'Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or RESEND_API_KEY' }, { status: 500 })
    }

    const db     = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const resend = new Resend(resendKey)

    // Fetch all auth users (1000 cap — sufficient for this app)
    const { data: usersData, error: usersError } = await db.auth.admin.listUsers({ perPage: 1000 })
    if (usersError) throw new Error(`listUsers: ${usersError.message}`)
    const users = usersData.users

    // Fetch all profiles for display names
    const { data: profiles, error: profilesError } = await db
      .from('profiles')
      .select('id, display_name')
    if (profilesError) throw new Error(`profiles: ${profilesError.message}`)

    const profileMap = new Map<string, string>(
      (profiles ?? []).map(p => [p.id as string, p.display_name as string])
    )

    // Fetch prediction data for all users in parallel
    const [
      { data: groupRows,   error: gcErr },
      { data: koRows,      error: kcErr },
      { data: awardRows,   error: arErr },
    ] = await Promise.all([
      db.from('group_predictions').select('user_id'),
      db.from('knockout_predictions').select('user_id'),
      db.from('award_predictions').select(
        'user_id, golden_boot_player, golden_boot_goals, golden_ball_player, golden_glove_player, best_young_player'
      ),
    ])

    if (gcErr) throw new Error(`group_predictions: ${gcErr.message}`)
    if (kcErr) throw new Error(`knockout_predictions: ${kcErr.message}`)
    if (arErr) throw new Error(`award_predictions: ${arErr.message}`)

    // Build per-user count maps
    const groupCountMap = new Map<string, number>()
    for (const row of (groupRows ?? [])) {
      const uid = row.user_id as string
      groupCountMap.set(uid, (groupCountMap.get(uid) ?? 0) + 1)
    }

    const koCountMap = new Map<string, number>()
    for (const row of (koRows ?? [])) {
      const uid = row.user_id as string
      koCountMap.set(uid, (koCountMap.get(uid) ?? 0) + 1)
    }

    type AwardRow = {
      user_id: string
      golden_boot_player: string | null
      golden_boot_goals: number | null
      golden_ball_player: string | null
      golden_glove_player: string | null
      best_young_player: string | null
    }
    const awardMap = new Map<string, AwardRow>()
    for (const row of (awardRows ?? []) as AwardRow[]) {
      awardMap.set(row.user_id, row)
    }

    // Determine incomplete users
    const incomplete: Array<{ email: string; displayName: string; missingSections: string[] }> = []

    for (const user of users) {
      if (!user.email) continue
      const uid = user.id
      const displayName = profileMap.get(uid) ?? user.email.split('@')[0]

      const groupDone = (groupCountMap.get(uid) ?? 0) === GROUP_COMPLETE_COUNT
      const koDone    = (koCountMap.get(uid) ?? 0)    === KNOCKOUT_COMPLETE_COUNT

      const award = awardMap.get(uid)
      const awardsCount = award
        ? [
            award.golden_boot_player?.trim(),
            award.golden_boot_goals != null ? String(award.golden_boot_goals) : '',
            award.golden_ball_player?.trim(),
            award.golden_glove_player?.trim(),
            award.best_young_player?.trim(),
          ].filter(v => v && v !== '').length
        : 0
      const awardsDone = awardsCount === AWARDS_COMPLETE_COUNT

      const missingSections: string[] = []
      if (!groupDone)  missingSections.push('group')
      if (!koDone)     missingSections.push('knockout')
      if (!awardsDone) missingSections.push('awards')

      if (missingSections.length > 0) {
        incomplete.push({ email: user.email, displayName, missingSections })
      }
    }

    // Send emails sequentially with 100ms gap to avoid rate limits
    const sent: string[] = []
    const errors: Array<{ email: string; error: string }> = []

    for (const u of incomplete) {
      try {
        const { subject, html } = buildReminderEmail({
          displayName: u.displayName,
          missingSections: u.missingSections,
          deadline,
          now,
          siteUrl: SITE_URL,
        })

        const { error } = await resend.emails.send({
          from: 'WC 2026 Predictions <noreply@wc2026-predictions.site>',
          to: u.email,
          subject,
          html,
        })

        if (error) throw new Error((error as { message?: string }).message ?? 'Resend error')
        sent.push(u.email)
      } catch (err) {
        errors.push({
          email: u.email,
          error: err instanceof Error ? err.message : String(err),
        })
      }

      await new Promise(r => setTimeout(r, 100))
    }

    return NextResponse.json({
      sent: sent.length,
      skipped_complete: users.length - incomplete.length,
      errors,
    })
  } catch (err) {
    console.error('[send-reminder]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
