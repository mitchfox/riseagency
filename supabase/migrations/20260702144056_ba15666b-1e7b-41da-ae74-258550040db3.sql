
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS stage_manual_override boolean NOT NULL DEFAULT false;

ALTER TABLE public.club_outreach_links DROP CONSTRAINT IF EXISTS club_outreach_links_target_type_check;
ALTER TABLE public.club_outreach_links ADD CONSTRAINT club_outreach_links_target_type_check CHECK (target_type IN ('club','agent','general'));
