-- Strategy & bulk drafts for Club Outreach + league metadata for clubs

ALTER TABLE public.club_map_positions
  ADD COLUMN IF NOT EXISTS league text,
  ADD COLUMN IF NOT EXISTS league_level text;

ALTER TABLE public.club_outreach_links
  ADD COLUMN IF NOT EXISTS is_pending_strategy_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS strategy_id uuid;

CREATE TABLE IF NOT EXISTS public.club_outreach_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  player_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_outreach_strategies TO authenticated;
GRANT ALL ON public.club_outreach_strategies TO service_role;

ALTER TABLE public.club_outreach_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read outreach strategies"
  ON public.club_outreach_strategies FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert outreach strategies"
  ON public.club_outreach_strategies FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update outreach strategies"
  ON public.club_outreach_strategies FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete outreach strategies"
  ON public.club_outreach_strategies FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

DROP TRIGGER IF EXISTS update_club_outreach_strategies_updated_at ON public.club_outreach_strategies;
CREATE TRIGGER update_club_outreach_strategies_updated_at
  BEFORE UPDATE ON public.club_outreach_strategies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();