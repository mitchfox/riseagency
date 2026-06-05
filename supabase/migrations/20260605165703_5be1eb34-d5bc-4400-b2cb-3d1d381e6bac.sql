
-- Enum for response status
DO $$ BEGIN
  CREATE TYPE public.outreach_response_status AS ENUM ('none','replied','interested','not_interested','signed','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Recruitment targets
CREATE TABLE IF NOT EXISTS public.recruitment_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'both' CHECK (scope IN ('youth','pro','both')),
  positions text[] NOT NULL DEFAULT '{}',
  min_age integer,
  max_age integer,
  nationalities text[] NOT NULL DEFAULT '{}',
  countries_of_club text[] NOT NULL DEFAULT '{}',
  min_club_rating text,
  max_club_rating text,
  priority integer NOT NULL DEFAULT 3,
  active boolean NOT NULL DEFAULT true,
  notes text,
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_targets TO authenticated;
GRANT ALL ON public.recruitment_targets TO service_role;
ALTER TABLE public.recruitment_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view targets" ON public.recruitment_targets
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'staff'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff can manage targets" ON public.recruitment_targets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'staff'::app_role) OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'staff'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_recruitment_targets_updated_at
  BEFORE UPDATE ON public.recruitment_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Extend outreach tables
ALTER TABLE public.player_outreach_youth
  ADD COLUMN IF NOT EXISTS response_status public.outreach_response_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_followup_at date,
  ADD COLUMN IF NOT EXISTS assigned_to uuid;

ALTER TABLE public.player_outreach_pro
  ADD COLUMN IF NOT EXISTS response_status public.outreach_response_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_followup_at date,
  ADD COLUMN IF NOT EXISTS assigned_to uuid;

-- Backfill from boolean
UPDATE public.player_outreach_youth
  SET response_status = 'replied', first_response_at = COALESCE(first_response_at, updated_at)
  WHERE response_received = true AND response_status = 'none';
UPDATE public.player_outreach_pro
  SET response_status = 'replied', first_response_at = COALESCE(first_response_at, updated_at)
  WHERE response_received = true AND response_status = 'none';

-- 3. Interactions table
CREATE TABLE IF NOT EXISTS public.outreach_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_id uuid NOT NULL,
  outreach_type text NOT NULL CHECK (outreach_type IN ('youth','pro')),
  kind text NOT NULL CHECK (kind IN ('message_out','reply_in','call','meeting','note')),
  channel text CHECK (channel IN ('instagram','whatsapp','email','phone','in_person','other')),
  summary text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_interactions_lookup
  ON public.outreach_interactions (outreach_type, outreach_id, occurred_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_interactions TO authenticated;
GRANT ALL ON public.outreach_interactions TO service_role;
ALTER TABLE public.outreach_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view interactions" ON public.outreach_interactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'staff'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff can manage interactions" ON public.outreach_interactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'staff'::app_role) OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'staff'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));
