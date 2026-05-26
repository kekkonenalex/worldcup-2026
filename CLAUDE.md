@AGENTS.md

# World Cup 2026 Predictions App — Project Guide

## Overview

A Next.js 16 full-stack web app for a FIFA World Cup 2026 prediction game. Users predict group-stage scores, build a knockout bracket, and pick award winners. Scores update as real match results come in. Deployed on Vercel with Supabase (Postgres + Auth).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database / Auth | Supabase (Postgres + Supabase Auth) |
| ORM | Supabase JS client v2 (`@supabase/supabase-js`, `@supabase/ssr`) |
| Email | Resend v6 (`resend ^6.12.3`) |
| Validation | Zod v4 (`zod ^4.4.3`) |
| Match data | football-data.org API v4 |
| Cron / deploy | Vercel (`vercel.json`) |
| Scripts | `tsx` — TypeScript scripts without compile step |

**SECURITY CONSTRAINT — never commit secrets:**
- `FOOTBALL_DATA_API_KEY` — always env var only
- `CRON_SECRET` — always env var only

---

## Environment Variables

All must be set in `.env.local` (local) and Vercel dashboard (production):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # needed for admin operations and account deletion
FOOTBALL_DATA_API_KEY=           # football-data.org API key
CRON_SECRET=                     # shared secret for cron route authorization
RESEND_API_KEY=                  # Resend email API key
```

---

## Project Structure

```
app/
  layout.tsx                      # root layout, Navbar, Footer
  page.tsx                        # homepage / dashboard redirect
  login/page.tsx                  # email+password + magic link login
  profile/
    page.tsx                      # profile overview (server component)
    edit/page.tsx                 # edit username, password, delete account
    actions.ts                    # Server Actions: changePassword, changeUsername, deleteAccount
  users/[id]/page.tsx             # public profile page (self or other)
  predictions/
    page.tsx                      # group stage prediction form
    knockout/page.tsx             # knockout bracket
    awards/page.tsx               # award predictions
    summary/page.tsx              # prediction completeness summary
    review/page.tsx               # review before deadline
    actions.ts                    # upsert group predictions
    knockout/actions.ts
    awards/actions.ts
  leaderboard/page.tsx
  leagues/
    page.tsx                      # browse / create leagues
    [id]/page.tsx                 # league detail
    [id]/members/[userId]/page.tsx
    actions.ts
  tournament/
    page.tsx                      # live tournament hub (scores, top scorers)
    bracket/page.tsx              # full bracket view
  admin/page.tsx                  # admin panel (match results, reminder trigger)
  api/
    cron/sync-matches/route.ts    # daily match sync from football-data.org
    cron/send-reminder/route.ts   # one-shot reminder email (June 9, 2026 09:00 UTC)
    admin/sync-now/route.ts       # manual sync trigger
    admin/sync-bootstrap/route.ts
    admin/trigger-reminder/route.ts  # admin UI → cron proxy

lib/
  supabase/client.ts              # browser Supabase client
  supabase/server.ts              # server Supabase client (cookie-based)
  supabase/middleware.ts          # session refresh middleware
  config.ts                       # PREDICTION_DEADLINE, isPastDeadline(), timeUntilDeadline()
  scoring.ts                      # pure scoring functions (no Supabase)
  scoring-server.ts               # getAllUserScores() — fetches + computes all scores
  simulation.ts                   # computeGroupStandings, rankThirdPlaceTeams, getAdvancingTeams
  bracket.ts                      # resolveBracket() — derives knockout bracket from predictions
  access.ts                       # canViewPredictions() — deadline + shared-league gate
  cache.ts                        # revalidateLeaderboard(), CACHE_TAGS
  results.ts                      # getAwardResults()
  sync.ts                         # syncMatchesFromApi()
  football-data.ts                # football-data.org API client
  email/reminder-html.ts          # buildReminderEmail() HTML template
  validation/profile.ts           # displayNameSchema (Zod)
  admin.ts                        # isAdmin() check
  team-flags.ts
  invite-code.ts

components/
  layout/Navbar.tsx
  layout/Footer.tsx
  layout/ProfileButton.tsx
  layout/MobileMenu.tsx
  ui/                             # Card, Button, Badge, TeamBadge, ScoreInput, etc.
  profile/
    ChangeUsernameForm.tsx        # client form — calls changeUsername action
    DeleteAccountForm.tsx         # client form — calls deleteAccount action
  ChangePasswordForm.tsx          # client form — calls changePassword action
  TopScorers.tsx                  # async server component, unstable_cache 10-min TTL
  AdminReminderTrigger.tsx        # client button — calls /api/admin/trigger-reminder
  AdminMatchResults.tsx
  PredictionsSummary.tsx          # full predictions display (group + knockout + awards)
  bracket/                        # BracketView, BracketMatch, KnockoutBracketWrapper, TournamentBracketView
  GroupStagePredictionForm.tsx
  AwardsForm.tsx
  LeaguesList.tsx
  LeagueDetail.tsx
  SignOutButton.tsx
  AccountSetupForm.tsx
  StandingsReview.tsx
  UpcomingMatches.tsx
  WelcomePopup.tsx (components/welcome/)

supabase/
  schema.sql                      # full DB schema
  seed.sql                        # team + match seed data
  migrations/
    20260522000000_unique_display_name.sql  # case-insensitive unique index on profiles.display_name

scripts/simulation/               # local test scripts (tsx)
  REMINDER.md                     # runbook for reminder cron
```

---

## Database Schema

Tables and their key relationships:

```
auth.users (Supabase managed)
  └─ profiles (id uuid PK → auth.users ON DELETE CASCADE)
        ├─ group_predictions      (user_id → profiles ON DELETE CASCADE)
        ├─ knockout_predictions   (user_id → profiles ON DELETE CASCADE)
        ├─ award_predictions      (user_id → profiles ON DELETE CASCADE)
        ├─ league_memberships     (user_id → profiles ON DELETE CASCADE)
        └─ leagues.created_by     (→ profiles ON DELETE CASCADE)

teams  ─── matches (home_team_id, away_team_id → teams)
matches ── group_predictions.match_id

leagues ── league_memberships.league_id (ON DELETE CASCADE)

award_results  # singleton row (id=1), updated by admin
```

**Key schema facts:**
- `matches.match_number`: group stage 1–72, R32 73–88, R16 89–96, QF 97–100, SF 97–100, 3rd place 103, final 104
- `matches.stage` values: `'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third_place' | 'final'`
- `knockout_predictions.bracket_position` = match_number the team is picked to win
- `matches.winner_team_id` — populated by admin when match finishes
- `profiles.display_name` — has case-insensitive unique index (migration 20260522000000)
- `profiles` has `is_admin boolean` column (checked via `lib/admin.ts`)

**Migration notes:**
- Migrations are run manually in the Supabase SQL editor dashboard (no CLI migration runner in use)
- The migration file in `supabase/migrations/` is the source of truth to paste

---

## Core Business Logic

### Prediction Deadline
`lib/config.ts` — `PREDICTION_DEADLINE = new Date('2026-06-10T23:59:00+03:00')` (Helsinki time)
- After this, predictions are locked — users can no longer edit
- Other users' predictions become visible (if in shared league)

### Prediction Completeness Thresholds
- Group: 72 rows in `group_predictions`
- Knockout: 32 rows in `knockout_predictions`
- Awards: 5 fields filled in `award_predictions` (boot player, boot goals, ball, glove, young player)

### Scoring System (`lib/scoring.ts`)
Group stage (per match):
- 6 pts: exact score
- 5 pts: correct result + correct goal difference (not exact)
- 3 pts: correct result, wrong GD
- 0 pts: wrong result
- +1 bonus: either team's goal count matches (only applies to base-0 or base-3)

Knockout (per team):
- Cumulative points for rounds correctly predicted: R16=6, QF=8, SF=10, Final=15, Champion=20
- Top-4 bonus: +25 per exact finish position (champion, runner-up, 3rd, 4th)

Awards:
- Golden Boot player: 20 pts
- Golden Boot goals: 10 pts
- Golden Ball: 20 pts
- Golden Glove: 20 pts
- Best Young Player: 15 pts

### Leaderboard Tiebreakers (in order)
1. Total points
2. Champion correct (0/1)
3. Runner-up correct (0/1)
4. 3rd place correct (0/1)
5. Golden Boot player correct (0/1)
6. Group stage total points
7. R32 correct picks count

### Access Control (`lib/access.ts`)
Users can view another user's predictions only if:
1. It's their own profile (`viewerId === targetUserId`), OR
2. Past the prediction deadline AND in at least one shared league

---

## API Routes

### Cron Routes
Both require `Authorization: Bearer ${CRON_SECRET}` header.

`GET /api/cron/sync-matches` — runs daily at 09:00 UTC, syncs match results from football-data.org
`GET /api/cron/send-reminder` — fires once June 9 2026 09:00 UTC (`schedule: "0 9 9 6 *"`), sends reminder emails to users with incomplete predictions. Has a time window guard (07:00–13:00 UTC) to avoid double-fires.

### Admin Routes
`POST /api/admin/sync-now` — manual match sync trigger (admin only)
`POST /api/admin/trigger-reminder` — proxies to send-reminder cron (admin only, checks `is_admin`)

---

## Key Patterns

### Supabase Clients
- **Browser:** `lib/supabase/client.ts` — `createClient()` from `@supabase/ssr`
- **Server (SSR):** `lib/supabase/server.ts` — `createClient()` async, cookie-based
- **Service role:** `createClient(url, svcKey, { auth: { persistSession: false } })` from `@supabase/supabase-js` — used for admin operations (deleteUser, listUsers, bypass RLS). Import as `createClient as createServiceClient` to avoid naming collision.

### Profile Updates Workaround
Typed Supabase client rejects profile update objects. Use `as never`:
```ts
await supabase.from('profiles').update({ display_name: newName } as never).eq('id', user.id)
```
Pattern established in `app/welcome/actions.ts`.

### `redirect()` in Server Actions
`redirect()` throws a special Next.js error that is swallowed inside `try/catch`. Always call `redirect()` OUTSIDE the try/catch block (after it, not inside).

### Zod v4 API
`.errors` was removed in Zod v4. Use `.issues`:
```ts
parsed.error.issues[0]?.message
```

### `unstable_cache` for External APIs
`TopScorers.tsx` uses `unstable_cache` (from `next/cache`) with a 10-minute TTL for the football-data.org scorers endpoint. This coexists with `export const dynamic = 'force-dynamic'` on page components — `unstable_cache` is independent.

### `revalidateTag` / `revalidatePath`
`lib/cache.ts` exposes `revalidateLeaderboard()`, `revalidatePredictions()`, `revalidateMatches()`.
Server Actions that mutate scored data call these after writing to DB.

---

## Profile & Account Management

### Routes
- `/profile` — overview (display name, email, edit link)
- `/profile/edit` — three sections: username, password, danger zone
- `/users/[id]` — public profile (scores, predictions if accessible)

### Username Validation (`lib/validation/profile.ts`)
- 2–30 characters
- Only `[a-zA-Z0-9_\- ]` (letters, numbers, spaces, hyphens, underscores)
- Case-insensitively unique enforced by PostgreSQL partial index: `profiles_display_name_lower_unique`
- Unique violation code: `'23505'` → return `'That username is already taken.'`

### Account Deletion (`app/profile/actions.ts → deleteAccount`)
Order of operations (uses service role client throughout):
1. For each league owned by user: transfer `created_by` to oldest non-owner member (by `joined_at`), or delete league if no other members
2. Delete `group_predictions`, `knockout_predictions`, `award_predictions` (belt-and-braces; CASCADE handles these too)
3. Delete `league_memberships`
4. Delete `profiles` row
5. `db.auth.admin.deleteUser(user.id)` — service role required
6. `supabase.auth.signOut()` (wrapped in try/catch, session may already be invalid)
7. `redirect('/login?deleted=1')` — called outside try/catch

---

## Email System

### Reminder Email (`lib/email/reminder-html.ts`)
- Subject: `"⏰ Your World Cup 2026 predictions — 36 hours left"`
- Sent via Resend v6: `resend.emails.send({ from, to, subject, html })`
- Returns `{ data, error }` (Resend v6 API)
- Only sent to users missing at least one of the three prediction sections
- `buildReminderEmail({ displayName, missingSections, deadlineLocal, siteUrl })` → `{ subject, html }`

### Cron Send Window
`app/api/cron/send-reminder/route.ts`:
- `WINDOW_START = new Date('2026-06-09T07:00:00Z')`
- `WINDOW_END = new Date('2026-06-09T13:00:00Z')`
- Returns `{ skipped: true, reason: 'Outside send window' }` if called outside this window

---

## football-data.org Integration

`lib/football-data.ts` — pure API client, no Supabase imports.

Key types: `FdPlayer`, `FdScorer`, `FdTeam`, `FdScore`, `FdMatch`

Functions:
- `fetchWorldCupScorers(apiKey, limit=10)` — scorers endpoint
- `fetchWorldCupMatches(apiKey)` — matches endpoint
- `classifyStage(stage)` — maps football-data stage strings to internal stage enum

Scorers tiebreaker sort order: goals DESC → assists DESC → playedMatches ASC → name ASC

---

## Vercel Cron Jobs (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/cron/sync-matches",  "schedule": "0 9 * * *"  },
    { "path": "/api/cron/send-reminder", "schedule": "0 9 9 6 *"  }
  ]
}
```

Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` for cron invocations.

---

## Scripts

All scripts under `scripts/simulation/`, run with `tsx`:

```
npm run sim:reset         # reset simulation DB
npm run sim:seed          # seed mini-tournament
npm run sim:sync-test     # smoke test match sync
npm run sim:score-test    # run scoring test
npm run sim:full          # reset + seed + score test
npm run sim:scorers-test  # smoke test scorers API
```

---

## Common Gotchas

1. **Supabase typed client and profile updates** — always use `as never` for `.update()` calls on `profiles`
2. **Zod v4** — use `.issues` not `.errors` on `ZodError`
3. **`redirect()` in Server Actions** — must be outside `try/catch`
4. **Service role client** — required for `auth.admin.deleteUser()` and `auth.admin.listUsers()`; never expose to the browser
5. **`force-dynamic` vs `unstable_cache`** — they are independent; `unstable_cache` caches across requests even on dynamically rendered pages
6. **Knockout bracket position** — `bracket_position` in `knockout_predictions` equals the `match_number` the team is predicted to WIN, not appear in
7. **Match 103** = 3rd-place playoff; match 104 = final; match 88 = last R32 game
8. **`revalidateTag` second argument** — in this Next.js version, `revalidateTag(tag, { expire: 0 })` is used (see `lib/cache.ts`)
9. **`params` is a Promise in Next.js 16** — always `await params` before destructuring: `const { id } = await params`
10. **Migrations run manually** — paste SQL into the Supabase SQL editor; no CLI migration runner

---

## Completed Features (as of 2026-05-22)

- User auth (email+password, magic link)
- Account setup (display name)
- Group stage predictions (72 matches)
- Knockout bracket predictions
- Award predictions
- Predictions review + summary
- Live scoring engine
- Leaderboard with tiebreakers
- Leagues (create, join via invite code, member management)
- Public user profiles with access control
- Admin panel (match results entry, sync trigger)
- Tournament hub (upcoming matches, top scorers from football-data.org)
- Daily match sync cron
- Deadline reminder email (cron + admin manual trigger)
- Profile edit page (username, password, delete account)
- Privacy policy, Terms of Service, Support/FAQ pages
