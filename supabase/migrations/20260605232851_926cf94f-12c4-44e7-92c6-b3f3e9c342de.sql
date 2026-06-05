
ALTER TABLE public.player_outreach_youth
  ADD COLUMN IF NOT EXISTS transfermarkt_url text,
  ADD COLUMN IF NOT EXISTS agent_name text,
  ADD COLUMN IF NOT EXISTS agent_status text;

ALTER TABLE public.player_outreach_pro
  ADD COLUMN IF NOT EXISTS transfermarkt_url text,
  ADD COLUMN IF NOT EXISTS agent_name text,
  ADD COLUMN IF NOT EXISTS agent_status text;

ALTER TABLE public.recruitment_scoring_settings
  ADD COLUMN IF NOT EXISTS position_adjacency_factor numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS league_strength_weight integer NOT NULL DEFAULT 10;

UPDATE public.recruitment_scoring_settings
SET bonus_weights = bonus_weights
  || jsonb_build_object(
      'agent_unrepresented', COALESCE((bonus_weights->>'agent_unrepresented')::int, 8),
      'agent_top_agency',    COALESCE((bonus_weights->>'agent_top_agency')::int, -12)
    )
WHERE id = 'singleton';
