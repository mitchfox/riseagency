ALTER TABLE public.club_outreach_links ADD COLUMN IF NOT EXISTS manually_viewed_at timestamptz NULL;
ALTER TABLE public.player_outreach_pro ADD COLUMN IF NOT EXISTS manually_viewed_at timestamptz NULL;
ALTER TABLE public.player_outreach_youth ADD COLUMN IF NOT EXISTS manually_viewed_at timestamptz NULL;