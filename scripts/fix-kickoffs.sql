-- Fix all incorrect scheduled_at values.
-- Sources:
--   Knockout stage: Wikipedia "2026 FIFA World Cup knockout stage" — raw local time + UTC offset,
--                   converted manually (UTC = local + |offset|).
--   Group stage:    Simultaneous-kickoff rule (FIFA requires matchday 3 games in each group
--                   to kick off at the same UTC time); Wikipedia group articles for confirmation.
-- Run once in the Supabase SQL editor. Idempotent.

-- ── Group stage fixes ────────────────────────────────────────────────────────
-- M12 (Bosnia and Herzegovina vs Qatar, Group B MD3) must be simultaneous with M11.
UPDATE matches SET scheduled_at = '2026-06-24T19:00:00Z' WHERE match_number = 12;

-- M48 (Cape Verde vs Saudi Arabia, Group H MD3) must be simultaneous with M47.
-- Both Group H MD3 games: 7 pm UTC−5 and 6 pm UTC−6 → both midnight UTC Jun 27.
UPDATE matches SET scheduled_at = '2026-06-27T00:00:00Z' WHERE match_number = 48;

-- M66 (DR Congo vs Uzbekistan, Group K MD3) must be simultaneous with M65.
UPDATE matches SET scheduled_at = '2026-06-27T23:30:00Z' WHERE match_number = 66;

-- ── Knockout stage ───────────────────────────────────────────────────────────
-- Round of 32
UPDATE matches SET scheduled_at = '2026-06-28T19:00:00Z' WHERE match_number = 73;  -- 12:00 pm UTC−7
UPDATE matches SET scheduled_at = '2026-06-29T20:30:00Z' WHERE match_number = 74;  --  4:30 pm UTC−4
UPDATE matches SET scheduled_at = '2026-06-30T01:00:00Z' WHERE match_number = 75;  --  7:00 pm UTC−6 (rolls to Jun 30)
UPDATE matches SET scheduled_at = '2026-06-29T17:00:00Z' WHERE match_number = 76;  -- 12:00 pm UTC−5
UPDATE matches SET scheduled_at = '2026-06-30T21:00:00Z' WHERE match_number = 77;  --  5:00 pm UTC−4
UPDATE matches SET scheduled_at = '2026-06-30T17:00:00Z' WHERE match_number = 78;  -- 12:00 pm UTC−5
UPDATE matches SET scheduled_at = '2026-07-01T01:00:00Z' WHERE match_number = 79;  --  7:00 pm UTC−6 (rolls to Jul 1)
UPDATE matches SET scheduled_at = '2026-07-01T16:00:00Z' WHERE match_number = 80;  -- 12:00 pm UTC−4
UPDATE matches SET scheduled_at = '2026-07-02T00:00:00Z' WHERE match_number = 81;  --  5:00 pm UTC−7 (rolls to Jul 2)
UPDATE matches SET scheduled_at = '2026-07-01T20:00:00Z' WHERE match_number = 82;  --  1:00 pm UTC−7
UPDATE matches SET scheduled_at = '2026-07-02T23:00:00Z' WHERE match_number = 83;  --  7:00 pm UTC−4
UPDATE matches SET scheduled_at = '2026-07-02T19:00:00Z' WHERE match_number = 84;  -- 12:00 pm UTC−7
UPDATE matches SET scheduled_at = '2026-07-03T03:00:00Z' WHERE match_number = 85;  --  8:00 pm UTC−7 (rolls to Jul 3)
UPDATE matches SET scheduled_at = '2026-07-03T22:00:00Z' WHERE match_number = 86;  --  6:00 pm UTC−4
UPDATE matches SET scheduled_at = '2026-07-04T01:30:00Z' WHERE match_number = 87;  --  8:30 pm UTC−5 (rolls to Jul 4)
UPDATE matches SET scheduled_at = '2026-07-03T18:00:00Z' WHERE match_number = 88;  --  1:00 pm UTC−5

-- Round of 16
UPDATE matches SET scheduled_at = '2026-07-04T21:00:00Z' WHERE match_number = 89;  --  5:00 pm UTC−4
UPDATE matches SET scheduled_at = '2026-07-04T17:00:00Z' WHERE match_number = 90;  -- 12:00 pm UTC−5
UPDATE matches SET scheduled_at = '2026-07-05T20:00:00Z' WHERE match_number = 91;  --  4:00 pm UTC−4
UPDATE matches SET scheduled_at = '2026-07-06T00:00:00Z' WHERE match_number = 92;  --  6:00 pm UTC−6 (rolls to Jul 6)
UPDATE matches SET scheduled_at = '2026-07-06T19:00:00Z' WHERE match_number = 93;  --  2:00 pm UTC−5
UPDATE matches SET scheduled_at = '2026-07-07T00:00:00Z' WHERE match_number = 94;  --  5:00 pm UTC−7 (rolls to Jul 7)
UPDATE matches SET scheduled_at = '2026-07-07T16:00:00Z' WHERE match_number = 95;  -- 12:00 pm UTC−4
UPDATE matches SET scheduled_at = '2026-07-07T20:00:00Z' WHERE match_number = 96;  --  1:00 pm UTC−7

-- Quarter-finals
UPDATE matches SET scheduled_at = '2026-07-09T20:00:00Z' WHERE match_number = 97;  --  4:00 pm UTC−4
UPDATE matches SET scheduled_at = '2026-07-10T19:00:00Z' WHERE match_number = 98;  -- 12:00 pm UTC−7
UPDATE matches SET scheduled_at = '2026-07-11T21:00:00Z' WHERE match_number = 99;  --  5:00 pm UTC−4
UPDATE matches SET scheduled_at = '2026-07-12T01:00:00Z' WHERE match_number = 100; --  8:00 pm UTC−5 (rolls to Jul 12)

-- Semi-finals
UPDATE matches SET scheduled_at = '2026-07-14T19:00:00Z' WHERE match_number = 101; --  2:00 pm UTC−5
UPDATE matches SET scheduled_at = '2026-07-15T19:00:00Z' WHERE match_number = 102; --  3:00 pm UTC−4

-- Third-place play-off
UPDATE matches SET scheduled_at = '2026-07-18T21:00:00Z' WHERE match_number = 103; --  5:00 pm UTC−4

-- Final
UPDATE matches SET scheduled_at = '2026-07-19T19:00:00Z' WHERE match_number = 104; --  3:00 pm UTC−4
