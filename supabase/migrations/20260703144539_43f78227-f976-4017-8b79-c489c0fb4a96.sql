
ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS goals_conceded integer,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'database',
  ADD COLUMN IF NOT EXISTS source_id uuid;

-- Allow rows that aren't tied to a players.id (e.g. youth/pro outreach entries).
ALTER TABLE public.player_stats ALTER COLUMN player_id DROP NOT NULL;

-- Backfill source_id for existing rows (they're all database players today).
UPDATE public.player_stats
   SET source_id = player_id
 WHERE source_id IS NULL AND player_id IS NOT NULL;

-- One stats row per (source, source_id) so upserts from the parser are deterministic
-- regardless of whether the underlying entity lives in players, player_outreach_youth
-- or player_outreach_pro.
CREATE UNIQUE INDEX IF NOT EXISTS player_stats_source_unique
  ON public.player_stats (source, source_id)
  WHERE source_id IS NOT NULL;
