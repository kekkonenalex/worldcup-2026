-- Fix knockout stage scheduled_at values.
-- Source: Wikipedia "2026 FIFA World Cup knockout stage" (authoritative UTC schedule).
-- All 32 knockout rows had placeholder dates/times (only 20:00 or 23:00 UTC, wrong dates).
-- Run this ONCE in the Supabase SQL editor. Idempotent.

UPDATE matches SET scheduled_at = '2026-06-28T19:00:00Z' WHERE match_number = 73;
UPDATE matches SET scheduled_at = '2026-06-29T20:30:00Z' WHERE match_number = 74;
UPDATE matches SET scheduled_at = '2026-06-29T19:00:00Z' WHERE match_number = 75;
UPDATE matches SET scheduled_at = '2026-06-29T21:00:00Z' WHERE match_number = 76;
UPDATE matches SET scheduled_at = '2026-06-30T21:00:00Z' WHERE match_number = 77;
UPDATE matches SET scheduled_at = '2026-06-30T17:00:00Z' WHERE match_number = 78;
UPDATE matches SET scheduled_at = '2026-07-01T01:00:00Z' WHERE match_number = 79;
UPDATE matches SET scheduled_at = '2026-07-01T16:00:00Z' WHERE match_number = 80;
UPDATE matches SET scheduled_at = '2026-07-02T00:00:00Z' WHERE match_number = 81;
UPDATE matches SET scheduled_at = '2026-07-01T20:00:00Z' WHERE match_number = 82;
UPDATE matches SET scheduled_at = '2026-07-02T19:00:00Z' WHERE match_number = 83;
UPDATE matches SET scheduled_at = '2026-07-02T07:00:00Z' WHERE match_number = 84;
UPDATE matches SET scheduled_at = '2026-07-03T03:00:00Z' WHERE match_number = 85;
UPDATE matches SET scheduled_at = '2026-07-03T18:00:00Z' WHERE match_number = 86;
UPDATE matches SET scheduled_at = '2026-07-04T01:30:00Z' WHERE match_number = 87;
UPDATE matches SET scheduled_at = '2026-07-03T17:00:00Z' WHERE match_number = 88;
UPDATE matches SET scheduled_at = '2026-07-04T17:00:00Z' WHERE match_number = 89;
UPDATE matches SET scheduled_at = '2026-07-04T21:00:00Z' WHERE match_number = 90;
UPDATE matches SET scheduled_at = '2026-07-05T20:00:00Z' WHERE match_number = 91;
UPDATE matches SET scheduled_at = '2026-07-06T00:00:00Z' WHERE match_number = 92;
UPDATE matches SET scheduled_at = '2026-07-06T19:00:00Z' WHERE match_number = 93;
UPDATE matches SET scheduled_at = '2026-07-07T00:00:00Z' WHERE match_number = 94;
UPDATE matches SET scheduled_at = '2026-07-07T16:00:00Z' WHERE match_number = 95;
UPDATE matches SET scheduled_at = '2026-07-07T20:00:00Z' WHERE match_number = 96;
UPDATE matches SET scheduled_at = '2026-07-09T20:00:00Z' WHERE match_number = 97;
UPDATE matches SET scheduled_at = '2026-07-10T19:00:00Z' WHERE match_number = 98;
UPDATE matches SET scheduled_at = '2026-07-11T21:00:00Z' WHERE match_number = 99;
UPDATE matches SET scheduled_at = '2026-07-12T00:00:00Z' WHERE match_number = 100;
UPDATE matches SET scheduled_at = '2026-07-14T19:00:00Z' WHERE match_number = 101;
UPDATE matches SET scheduled_at = '2026-07-15T19:00:00Z' WHERE match_number = 102;
UPDATE matches SET scheduled_at = '2026-07-18T21:00:00Z' WHERE match_number = 103;
UPDATE matches SET scheduled_at = '2026-07-19T19:00:00Z' WHERE match_number = 104;
