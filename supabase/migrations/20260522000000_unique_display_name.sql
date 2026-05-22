-- Pre-flight check: detect existing case-insensitive duplicates.
-- If this raises an exception, resolve the duplicates first:
--   SELECT lower(display_name), array_agg(id), array_agg(display_name)
--   FROM profiles GROUP BY lower(display_name) HAVING COUNT(*) > 1;
-- Then manually rename the conflicting users via UPDATE before re-running.
DO $$
DECLARE
  duplicate_count int;
BEGIN
  SELECT COUNT(*) INTO duplicate_count FROM (
    SELECT lower(display_name)
    FROM profiles
    WHERE display_name IS NOT NULL
    GROUP BY lower(display_name)
    HAVING COUNT(*) > 1
  ) dupes;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION
      'Cannot add unique constraint: % case-insensitive duplicate display_name values exist. Resolve manually first.',
      duplicate_count;
  END IF;
END $$;

-- Case-insensitive unique index on display_name.
-- Allows NULL (users during setup), enforces uniqueness for non-NULL values.
CREATE UNIQUE INDEX profiles_display_name_lower_unique
  ON profiles (lower(display_name))
  WHERE display_name IS NOT NULL;
