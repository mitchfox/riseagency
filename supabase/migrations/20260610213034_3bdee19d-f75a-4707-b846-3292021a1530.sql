
-- Technical programming tables
CREATE TABLE public.technical_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  program_name text NOT NULL,
  phase_name text,
  phase_dates text,
  overview_text text,
  schedule_notes text,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  weekly_schedules jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_programs TO authenticated;
GRANT ALL ON public.technical_programs TO service_role;
ALTER TABLE public.technical_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage technical programs"
  ON public.technical_programs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Players read own technical programs"
  ON public.technical_programs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = technical_programs.player_id
        AND lower(p.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );

CREATE INDEX idx_technical_programs_player ON public.technical_programs(player_id);
CREATE INDEX idx_technical_programs_current ON public.technical_programs(player_id, is_current) WHERE is_current = true;

-- Sessions
CREATE TABLE public.technical_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.technical_programs(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  title text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_sessions TO authenticated;
GRANT ALL ON public.technical_sessions TO service_role;
ALTER TABLE public.technical_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage technical sessions"
  ON public.technical_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Players read own technical sessions"
  ON public.technical_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.technical_programs tp
      JOIN public.players p ON p.id = tp.player_id
      WHERE tp.id = technical_sessions.program_id
        AND lower(p.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );

CREATE INDEX idx_technical_sessions_program ON public.technical_sessions(program_id);

-- Drills
CREATE TABLE public.technical_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.technical_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  reps text,
  sets text,
  reps_per_side boolean NOT NULL DEFAULT false,
  load text,
  recovery_time text,
  notes text,
  diagram jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_drills TO authenticated;
GRANT ALL ON public.technical_drills TO service_role;
ALTER TABLE public.technical_drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage technical drills"
  ON public.technical_drills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Players read own technical drills"
  ON public.technical_drills FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.technical_sessions ts
      JOIN public.technical_programs tp ON tp.id = ts.program_id
      JOIN public.players p ON p.id = tp.player_id
      WHERE ts.id = technical_drills.session_id
        AND lower(p.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );

CREATE INDEX idx_technical_drills_session ON public.technical_drills(session_id);

-- Variations
CREATE TABLE public.technical_drill_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id uuid NOT NULL REFERENCES public.technical_drills(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  reps text,
  sets text,
  reps_per_side boolean NOT NULL DEFAULT false,
  load text,
  recovery_time text,
  notes text,
  diagram jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_drill_variations TO authenticated;
GRANT ALL ON public.technical_drill_variations TO service_role;
ALTER TABLE public.technical_drill_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage technical drill variations"
  ON public.technical_drill_variations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Players read own technical drill variations"
  ON public.technical_drill_variations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.technical_drills td
      JOIN public.technical_sessions ts ON ts.id = td.session_id
      JOIN public.technical_programs tp ON tp.id = ts.program_id
      JOIN public.players p ON p.id = tp.player_id
      WHERE td.id = technical_drill_variations.drill_id
        AND lower(p.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );

CREATE INDEX idx_technical_drill_variations_drill ON public.technical_drill_variations(drill_id);

-- updated_at triggers
CREATE TRIGGER trg_technical_programs_updated_at BEFORE UPDATE ON public.technical_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_technical_sessions_updated_at BEFORE UPDATE ON public.technical_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_technical_drills_updated_at BEFORE UPDATE ON public.technical_drills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_technical_drill_variations_updated_at BEFORE UPDATE ON public.technical_drill_variations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cross-program day uniqueness trigger
CREATE OR REPLACE FUNCTION public.validate_program_day_unique()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
  conflict_rec record;
  this_week text;
  this_day text;
  this_session text;
  sched jsonb;
BEGIN
  pid := NEW.player_id;
  IF NEW.weekly_schedules IS NULL OR jsonb_typeof(NEW.weekly_schedules) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR sched IN SELECT * FROM jsonb_array_elements(NEW.weekly_schedules)
  LOOP
    this_week := sched->>'week';
    IF this_week IS NULL THEN CONTINUE; END IF;

    FOR this_day IN SELECT jsonb_object_keys(coalesce(sched->'days','{}'::jsonb))
    LOOP
      this_session := coalesce(sched->'days'->this_day->>'session','');
      IF this_session = '' THEN CONTINUE; END IF;

      -- Check other table for same player/week/day having a session
      IF TG_TABLE_NAME = 'technical_programs' THEN
        SELECT pp.program_name INTO conflict_rec
        FROM public.player_programs pp,
             jsonb_array_elements(pp.weekly_schedules) AS s
        WHERE pp.player_id = pid
          AND pp.id IS DISTINCT FROM NEW.id
          AND s->>'week' = this_week
          AND coalesce(s->'days'->this_day->>'session','') <> ''
        LIMIT 1;
      ELSE
        SELECT tp.program_name INTO conflict_rec
        FROM public.technical_programs tp,
             jsonb_array_elements(tp.weekly_schedules) AS s
        WHERE tp.player_id = pid
          AND tp.id IS DISTINCT FROM NEW.id
          AND s->>'week' = this_week
          AND coalesce(s->'days'->this_day->>'session','') <> ''
        LIMIT 1;
      END IF;

      IF FOUND THEN
        RAISE EXCEPTION 'Schedule clash on % %: day already used by %', this_week, this_day, conflict_rec.program_name;
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_technical_programs_day_unique
  BEFORE INSERT OR UPDATE OF weekly_schedules ON public.technical_programs
  FOR EACH ROW EXECUTE FUNCTION public.validate_program_day_unique();

CREATE TRIGGER trg_player_programs_day_unique
  BEFORE INSERT OR UPDATE OF weekly_schedules ON public.player_programs
  FOR EACH ROW EXECUTE FUNCTION public.validate_program_day_unique();
