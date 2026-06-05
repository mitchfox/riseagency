ALTER TABLE public.whatsapp_quick_messages
  ADD COLUMN IF NOT EXISTS target_id uuid REFERENCES public.recruitment_targets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'both' CHECK (scope IN ('youth','pro','both'));

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS target_id uuid REFERENCES public.recruitment_targets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'both' CHECK (scope IN ('youth','pro','both'));

ALTER TABLE public.recruitment_targets
  ADD COLUMN IF NOT EXISTS default_whatsapp_template_id uuid REFERENCES public.whatsapp_quick_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_email_template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS fit_score integer,
  ADD COLUMN IF NOT EXISTS fit_score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS fit_score_target_id uuid REFERENCES public.recruitment_targets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fit_score_updated_at timestamptz;

ALTER TABLE public.player_outreach_youth
  ADD COLUMN IF NOT EXISTS fit_score integer,
  ADD COLUMN IF NOT EXISTS fit_score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS fit_score_target_id uuid REFERENCES public.recruitment_targets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fit_score_updated_at timestamptz;

ALTER TABLE public.player_outreach_pro
  ADD COLUMN IF NOT EXISTS fit_score integer,
  ADD COLUMN IF NOT EXISTS fit_score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS fit_score_target_id uuid REFERENCES public.recruitment_targets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fit_score_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.recruitment_scoring_settings (
  id text PRIMARY KEY DEFAULT 'singleton',
  weights jsonb NOT NULL DEFAULT '{"position":20,"age":15,"nationality":10,"club_country":5,"club_rating":15,"outreach":15,"ai_nudge":20}'::jsonb,
  age_sweet_spot_band integer NOT NULL DEFAULT 2,
  ai_nudge_enabled boolean NOT NULL DEFAULT true,
  fit_score_threshold integer NOT NULL DEFAULT 60,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT recruitment_scoring_settings_singleton CHECK (id = 'singleton')
);

GRANT SELECT, INSERT, UPDATE ON public.recruitment_scoring_settings TO authenticated;
GRANT ALL ON public.recruitment_scoring_settings TO service_role;

ALTER TABLE public.recruitment_scoring_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view scoring settings" ON public.recruitment_scoring_settings;
CREATE POLICY "Staff can view scoring settings"
  ON public.recruitment_scoring_settings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin can manage scoring settings" ON public.recruitment_scoring_settings;
CREATE POLICY "Admin can manage scoring settings"
  ON public.recruitment_scoring_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.recruitment_scoring_settings (id) VALUES ('singleton') ON CONFLICT DO NOTHING;

DROP TRIGGER IF EXISTS trg_recruitment_scoring_settings_updated ON public.recruitment_scoring_settings;
CREATE TRIGGER trg_recruitment_scoring_settings_updated
  BEFORE UPDATE ON public.recruitment_scoring_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();