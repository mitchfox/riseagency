
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS last_tm_refreshed_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_players_last_tm_refreshed_at ON public.players (last_tm_refreshed_at);

ALTER TABLE public.player_outreach_youth ADD COLUMN IF NOT EXISTS last_tm_refreshed_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_pou_last_tm_refreshed_at ON public.player_outreach_youth (last_tm_refreshed_at);

ALTER TABLE public.player_outreach_pro ADD COLUMN IF NOT EXISTS last_tm_refreshed_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_pop_last_tm_refreshed_at ON public.player_outreach_pro (last_tm_refreshed_at);

ALTER TABLE public.transfermarkt_refresh_jobs
  ADD COLUMN IF NOT EXISTS last_processed_outreach_youth_id uuid,
  ADD COLUMN IF NOT EXISTS last_processed_outreach_pro_id uuid,
  ADD COLUMN IF NOT EXISTS players_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS outreach_youth_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS outreach_pro_done boolean NOT NULL DEFAULT false;
