
-- 1. programming_weeks: single source of truth for a player's weekly schedule
CREATE TABLE public.programming_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  label text,
  week_start_date date,
  display_order integer NOT NULL DEFAULT 0,
  slots jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX programming_weeks_player_idx ON public.programming_weeks(player_id, display_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.programming_weeks TO authenticated;
GRANT ALL ON public.programming_weeks TO service_role;

ALTER TABLE public.programming_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage programming weeks"
  ON public.programming_weeks
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER programming_weeks_updated_at
  BEFORE UPDATE ON public.programming_weeks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. session_type toggle on technical_sessions
ALTER TABLE public.technical_sessions
  ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'technical'
    CHECK (session_type IN ('sps', 'technical'));

-- 3. linked_week_ids on both programme tables
ALTER TABLE public.player_programs
  ADD COLUMN IF NOT EXISTS linked_week_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.technical_programs
  ADD COLUMN IF NOT EXISTS linked_week_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- 4. Remove the day-clash validation function (no triggers reference it, but drop the function so it can't be re-attached)
DROP FUNCTION IF EXISTS public.validate_program_day_unique() CASCADE;
