# Simulation Environment

## Why this exists

The World Cup starts on 11 June 2026. This simulation suite de-risks two things:

1. **Sync correctness** — football-data.org returns real match data. Does our parser extract the right scores and statuses?
2. **Scoring correctness** — given known predictions and known results, does the scoring engine produce the exact expected points for each user?

All scripts run against a **separate staging Supabase project**. Production data is untouched. A guard in `lib/staging-client.ts` refuses to run if the staging URL matches production.

---

## Manual prerequisites

### 1. Create a staging Supabase project

Go to [supabase.com](https://supabase.com), create a new project (free tier is fine).

### 2. Run the staging schema

In the Supabase SQL editor, paste and run the contents of:

```
scripts/simulation/staging-schema.sql
```

This creates all tables, RLS policies, and the trigger that auto-creates profiles on sign-up.

### 3. Populate `.env.staging.local`

Edit the file at the project root with your actual staging credentials:

```
NEXT_PUBLIC_SUPABASE_URL_STAGING=https://your-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_STAGING=eyJ...
SUPABASE_SERVICE_ROLE_KEY_STAGING=eyJ...
FOOTBALL_DATA_API_KEY=your-football-data-key
```

All four values are required. The file is git-ignored (`.env*` pattern).

---

## Running the simulation

### Full end-to-end (reset → seed → score test)

```
npm run sim:full
```

### Individual steps

| Command | What it does |
|---|---|
| `npm run sim:reset` | Wipes all data from staging (auth users, teams, matches, predictions). Safe to re-run. |
| `npm run sim:seed` | Inserts 4 teams, 9 matches, 3 test users, and hand-crafted predictions. |
| `npm run sim:score-test` | Injects match results, runs the scoring engine, compares to expected totals. |
| `npm run sim:sync-test` | Fetches last 10 finished PL matches from football-data.org. Prints a table. |
| `npm run sim:sync-test:cl` | Same for Champions League. |

---

## Interpreting output

### `sim:score-test` — verdict table

```
User            Exp   Act   Group    KO   Top4   Awds  Status
----------------------------------------------------------------------
alice           229   229      36    83     25     85  ✓ PASS
bob             148   148      29    59     25     35  ✓ PASS
charlie          25    25       1    24      0      0  ✓ PASS
```

Exit code 0 = all pass. Exit code 1 = at least one FAIL row.

### `sim:sync-test` — smoke table

```
Date        Home                  Score    Away                Stage     Status
--------------------------------------------------------------------------------
2026-05-17  Manchester City         2-1    Arsenal             group     finished
...
```

Verify the scores and dates against a known football results site. If they match, HTTP parsing is correct.

---

## Expected score breakdown

The mini-tournament uses match numbers that sit in the scoring engine's hard-coded ranges:

| Match | Range in scoring engine | Label |
|---|---|---|
| M1–M6 | match_number ≤ 72 | group stage |
| M97–M98 | 97–100 | SF (cumulative: R16+QF+SF = 6+8+10 = 24 pts) |
| M104 | 104 | Champion (cumulative: 6+8+10+15+20 = 59 pts) |

### Actual results injected by `sim:score-test`

| Match | Result | Winner |
|---|---|---|
| M1 | Alpha 2-1 Bravo | — |
| M2 | Alpha 3-0 Charlie | — |
| M3 | Alpha 1-1 Delta | — |
| M4 | Bravo 2-2 Charlie | — |
| M5 | Bravo 1-0 Delta | — |
| M6 | Charlie 2-1 Delta | — |
| M97 (SF) | Alpha 2-0 Delta | Alpha |
| M98 (SF) | Bravo 1-0 Charlie | Bravo |
| M104 (Final) | Alpha 2-1 Bravo | **Alpha (Champion)** |

Awards: golden_boot "Striker Alpha" (5 goals), golden_ball "Alpha Star", golden_glove "Goalkeeper G", best_young "Young P".

### alice (229 pts)

| Component | Calculation | Points |
|---|---|---|
| Group | 6 exact predictions × 6 pts each | 36 |
| Knockout — Alpha Champion | predicted Champion, actual Champion: 6+8+10+15+20 | 59 |
| Knockout — Bravo SF | predicted SF, actual SF: 6+8+10 | 24 |
| Top-4 bonus | Champion correct (+25) | 25 |
| Awards | all 5 correct: 20+10+20+20+15 | 85 |
| **Total** | | **229** |

### bob (148 pts)

| Component | Calculation | Points |
|---|---|---|
| Group | M1 same-GD=5, M2 diff-GD+tally=4, M3–M6 same-GD=5 each | 29 |
| Knockout — Alpha Champion | predicted Champion, actual Champion | 59 |
| Knockout — Charlie | predicted Charlie SF, actual no wins → 0 | 0 |
| Top-4 bonus | Champion correct (+25) | 25 |
| Awards | ball+young correct: 20+15 | 35 |
| **Total** | | **148** |

### charlie (25 pts)

| Component | Calculation | Points |
|---|---|---|
| Group | M1 tally bonus only (+1), rest wrong (0) | 1 |
| Knockout — Bravo | predicted Champion, actual SF: cap=SF → 24 | 24 |
| Top-4 bonus | predicted Bravo as Champion, actual Alpha → 0 | 0 |
| Awards | all wrong | 0 |
| **Total** | | **25** |

---

## What is covered

- `lib/scoring.ts` — `scoreGroupMatch`, `scoreKnockoutForUser`, `scoreAwardsForUser`, `computeUserScore`, `TOP_FOUR_BONUS`, cumulative knockout points
- `lib/scoring-server.ts` — `getAllUserScores`, `fetchAllScoringData` (called with staging client)
- `lib/football-data.ts` — live HTTP round-trip, JSON parsing, status/stage classification

## What is NOT covered

- Email delivery (Supabase magic links)
- RLS as anonymous user (scripts use service role)
- Group stage cascade into knockout bracket (knockout teams are set directly)
- `lib/sync.ts` full pipeline (bootstrapExternalIds, rebuildKnockoutCascade) — tested in smoke test only at the HTTP layer
- Vercel deployment environment

---

## Extending the test fixtures

To add a new scoring scenario:

1. Add group/knockout/award predictions for a new user in `seed-mini-tournament.ts`.
2. Add the expected score entry to `EXPECTED_SCORES` in `run-scoring-test.ts`.
3. Run `npm run sim:full` to verify.

---

## Safety note

`scripts/simulation/lib/staging-client.ts` throws at startup if:
- `.env.staging.local` is missing or unpopulated
- The staging URL matches the production URL (`NEXT_PUBLIC_SUPABASE_URL`)

These guards ensure no simulation script can accidentally write to production.
