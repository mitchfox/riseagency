-- Backfill date_of_birth from bio JSON for players that have it
-- Handle both YYYY-MM-DD and DD/MM/YYYY formats
UPDATE public.players
SET date_of_birth = CASE
  -- YYYY-MM-DD format
  WHEN (bio::jsonb->>'dateOfBirth') ~ '^\d{4}-\d{2}-\d{2}$'
    THEN (bio::jsonb->>'dateOfBirth')::date
  -- DD/MM/YYYY format
  WHEN (bio::jsonb->>'dateOfBirth') ~ '^\d{2}/\d{2}/\d{4}$'
    THEN to_date(bio::jsonb->>'dateOfBirth', 'DD/MM/YYYY')
  ELSE NULL
END
WHERE bio IS NOT NULL
  AND bio::text LIKE '%dateOfBirth%'
  AND date_of_birth IS NULL;