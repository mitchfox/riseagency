CREATE INDEX IF NOT EXISTS idx_outreach_interactions_lookup
  ON public.outreach_interactions (outreach_id, outreach_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_youth_pipeline
  ON public.player_outreach_youth (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_youth_starred
  ON public.player_outreach_youth (is_starred) WHERE is_starred = true;

CREATE INDEX IF NOT EXISTS idx_outreach_pro_pipeline
  ON public.player_outreach_pro (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_pro_starred
  ON public.player_outreach_pro (is_starred) WHERE is_starred = true;

CREATE INDEX IF NOT EXISTS idx_recruitment_targets_active
  ON public.recruitment_targets (active) WHERE active = true;