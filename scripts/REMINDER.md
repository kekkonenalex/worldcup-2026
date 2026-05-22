# Deadline Reminder Email

## Schedule

Vercel cron fires at **09:00 UTC on June 9, 2026** — approximately 36 hours before the
prediction deadline (June 10, 2026 at 23:59 Helsinki time / UTC+3).

The route has a date guard: it only sends emails within a 6-hour window
(07:00–13:00 UTC on June 9, 2026). Outside that window it returns `{ skipped: true }`
and does nothing. This makes the cron entry safe to leave in `vercel.json` after
June 2026 — it will be a no-op in future years.

## What gets sent

One email per user who has **not completed all three prediction sections**:

| Section  | Complete when                              |
|----------|--------------------------------------------|
| Group    | 72 rows in `group_predictions` for user    |
| Knockout | 32 rows in `knockout_predictions` for user |
| Awards   | Row in `award_predictions` with all 5 fields filled |

Users who have completed all three sections receive nothing.

## Manual trigger for local testing

Start the dev server first (`npm run dev`), then run in PowerShell:

```powershell
$secret = (Get-Content .env.local | Where-Object { $_ -match "^CRON_SECRET=" }) -replace "^CRON_SECRET=",""
Invoke-RestMethod -Uri "http://localhost:3000/api/cron/send-reminder" -Method GET -Headers @{ Authorization = "Bearer $secret" }
```

The date guard will return `{ skipped: true }` when outside the June 9 window.
To do a full end-to-end test, **temporarily comment out the date guard** in
`app/api/cron/send-reminder/route.ts` (the `if (now < WINDOW_START || now > WINDOW_END)` block),
trigger manually, then restore it.

You can also trigger from the admin panel: `/admin` → "Send Deadline Reminder Now".

## Required env vars

| Variable                  | Where needed       | Notes                                      |
|---------------------------|--------------------|--------------------------------------------|
| `CRON_SECRET`             | .env.local, Vercel | Vercel sets `Authorization: Bearer <val>` automatically |
| `RESEND_API_KEY`          | .env.local, Vercel | Get from resend.com → API Keys             |
| `SUPABASE_SERVICE_ROLE_KEY` | .env.local, Vercel | Supabase dashboard → Project Settings → API → service_role |

## After June 9, 2026

Remove the cron entry from `vercel.json` for cleanliness, or leave it — the date guard
makes it a no-op in future years.
