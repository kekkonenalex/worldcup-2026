# World Cup 2026 Predictions

**Live:** [wc2026-predictions.site](https://www.wc2026-predictions.site/)

A full-stack prediction game for the FIFA World Cup 2026. Players predict every group-stage score, build a complete knockout bracket and pick the individual award winners. A custom scoring engine updates leaderboards automatically as real match results come in.

Built with Next.js 16 (App Router), TypeScript, Supabase, Tailwind CSS, Resend and Vercel.

> Not affiliated with FIFA or any official World Cup organisation.

---

## Features

- **Group-stage predictions** for all 72 matches, with live-computed group standings and third-place ranking
- **Knockout bracket** derived automatically from the user's own group predictions (R32 → Final)
- **Award predictions**: Golden Boot (player + goals), Golden Ball, Golden Glove, Best Young Player
- **Scoring engine** with exact-score, goal-difference and bonus rules, cumulative knockout points and top-4 bonuses
- **Leaderboard** with a seven-level tiebreaker chain
- **Private leagues** with invite codes and member management
- **Access control**: other players' predictions become visible only after the deadline, and only to people in a shared league
- **Tournament hub**: upcoming matches, live group tables, full bracket view and top scorers
- **Automated match sync** from the football-data.org API via a daily Vercel cron job
- **Deadline reminder emails** sent through Resend to users with incomplete predictions
- **Admin panel** for result entry, manual sync and award winners
- **Account management**: username and password changes, and full account deletion that hands league ownership to another member

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Server Components) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database & auth | Supabase (Postgres, Row Level Security, email + magic-link auth) |
| Validation | Zod v4 |
| Email | Resend |
| Match data | football-data.org API v4 |
| Hosting & cron | Vercel |
| Scripts | `tsx` |

## Architecture highlights

- **Pure scoring logic.** `lib/scoring.ts` and `lib/simulation.ts` contain no database code, so scoring, group standings and bracket resolution can be tested in isolation.
- **Caching.** Leaderboard and prediction data use tag-based revalidation (`lib/cache.ts`). External API calls such as top scorers are cached with a 10-minute TTL.
- **Secure cron endpoints.** Cron and admin routes require a shared `CRON_SECRET` or an admin check. Service-role database access stays server-side only.
- **Simulation tooling.** `scripts/simulation/` seeds a mini-tournament against a staging schema and runs end-to-end scoring and sync smoke tests.

## Scoring

| Stage | Rule | Points |
|---|---|---|
| Group match | Exact score | 6 |
| | Correct result + goal difference | 5 |
| | Correct result | 3 |
| | Bonus: one team's goal count correct | +1 |
| Knockout (per team) | Reaches R16 / QF / SF / Final / wins | 6 / 8 / 10 / 15 / 20 |
| | Exact top-4 finishing position | +25 each |
| Awards | Golden Boot player / goals | 20 / 10 |
| | Golden Ball, Golden Glove | 20 each |
| | Best Young Player | 15 |

## Project structure

```
app/          routes, pages, Server Actions and API routes (cron + admin)
components/   UI, bracket, tournament, leaderboard and form components
lib/          scoring, simulation, bracket logic, access control, API client, Supabase clients
supabase/     schema, seed data and migrations
scripts/      simulation and diagnostic scripts
```

## Local development

1. Clone the repo and run `npm install`
2. Create a `.env.local` file with the following variables (values not included):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `FOOTBALL_DATA_API_KEY`
   - `CRON_SECRET`
3. Create the database: run `supabase/schema.sql`, then `supabase/seed.sql`, then the files in `supabase/migrations/` in the Supabase SQL editor
4. Run `npm run dev`

### Simulation scripts

```bash
npm run sim:full          # reset + seed a mini-tournament + run the scoring test
npm run sim:sync-test     # smoke test the match sync
npm run sim:scorers-test  # smoke test the top-scorers API
```
