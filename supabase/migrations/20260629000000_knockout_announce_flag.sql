-- One-time "Knockout scoring is live" announcement flag.
-- DEFAULT false means every EXISTING user has knockout_announce_shown = false,
-- so all of them see the announcement once on their next visit. New users going
-- forward also start at false (they'll see the welcome popup first, then this one
-- on a later visit — never both at once; see app/page.tsx priority logic).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS knockout_announce_shown boolean NOT NULL DEFAULT false;
