-- =========================
-- 1. sps_programs
-- =========================
CREATE TABLE public.sps_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  program_name text NOT NULL DEFAULT 'SPS programme',
  phase_name text,
  start_date date,
  end_date date,
  overview_text text,
  is_current boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  linked_week_ids uuid[] NOT NULL DEFAULT '{}',
  legacy_player_program_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sps_programs TO authenticated;
GRANT ALL ON public.sps_programs TO service_role;

ALTER TABLE public.sps_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage SPS programs"
  ON public.sps_programs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Players read own SPS programs"
  ON public.sps_programs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = sps_programs.player_id
      AND lower(p.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  ));

CREATE INDEX sps_programs_player_idx ON public.sps_programs(player_id, display_order);

CREATE TRIGGER sps_programs_set_updated_at
  BEFORE UPDATE ON public.sps_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 2. sps_sessions
-- =========================
CREATE TABLE public.sps_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.sps_programs(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  session_kind text NOT NULL DEFAULT 'main' CHECK (session_kind IN ('main','pre')),
  title text,
  description text,
  staff_notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sps_sessions TO authenticated;
GRANT ALL ON public.sps_sessions TO service_role;

ALTER TABLE public.sps_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage SPS sessions"
  ON public.sps_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Players read own SPS sessions"
  ON public.sps_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sps_programs prog
    JOIN public.players p ON p.id = prog.player_id
    WHERE prog.id = sps_sessions.program_id
      AND lower(p.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  ));

CREATE INDEX sps_sessions_program_idx ON public.sps_sessions(program_id, display_order);

CREATE TRIGGER sps_sessions_set_updated_at
  BEFORE UPDATE ON public.sps_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 3. sps_exercises
-- =========================
CREATE TABLE public.sps_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sps_sessions(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text,
  reps text,
  sets text,
  load text,
  recovery_time text,
  video_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sps_exercises TO authenticated;
GRANT ALL ON public.sps_exercises TO service_role;

ALTER TABLE public.sps_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage SPS exercises"
  ON public.sps_exercises FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Players read own SPS exercises"
  ON public.sps_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sps_sessions s
    JOIN public.sps_programs prog ON prog.id = s.program_id
    JOIN public.players p ON p.id = prog.player_id
    WHERE s.id = sps_exercises.session_id
      AND lower(p.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  ));

CREATE INDEX sps_exercises_session_idx ON public.sps_exercises(session_id, display_order);

CREATE TRIGGER sps_exercises_set_updated_at
  BEFORE UPDATE ON public.sps_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 4. Back-fill from legacy player_programs JSONB
-- =========================
DO $migrate$
DECLARE
  pp RECORD;
  new_prog_id uuid;
  sess_field text;
  sess_data jsonb;
  session_key_v text;
  session_kind_v text;
  new_sess_id uuid;
  ex jsonb;
  ex_idx int;
  sess_idx int;
  field_list text[] := ARRAY[
    'sessionA','sessionB','sessionC','sessionD','sessionE','sessionF','sessionG','sessionH',
    'preSessionA','preSessionB','preSessionC','preSessionD','preSessionE','preSessionF','preSessionG','preSessionH'
  ];
BEGIN
  FOR pp IN
    SELECT * FROM public.player_programs ORDER BY player_id, display_order, created_at
  LOOP
    INSERT INTO public.sps_programs (
      player_id, program_name, phase_name, end_date,
      overview_text, is_current, display_order, linked_week_ids,
      legacy_player_program_id
    )
    VALUES (
      pp.player_id,
      COALESCE(NULLIF(pp.program_name, ''), 'SPS programme'),
      pp.phase_name,
      pp.end_date,
      pp.overview_text,
      COALESCE(pp.is_current, false),
      COALESCE(pp.display_order, 0),
      COALESCE(pp.linked_week_ids, '{}'::uuid[]),
      pp.id
    )
    RETURNING id INTO new_prog_id;

    sess_idx := 0;
    FOREACH sess_field IN ARRAY field_list LOOP
      sess_data := COALESCE(pp.sessions -> sess_field, '{}'::jsonb);
      IF sess_data ? 'exercises' AND jsonb_typeof(sess_data->'exercises') = 'array'
         AND jsonb_array_length(sess_data->'exercises') > 0 THEN
        IF sess_field LIKE 'preSession%' THEN
          session_kind_v := 'pre';
          session_key_v := substring(sess_field FROM 11);
        ELSE
          session_kind_v := 'main';
          session_key_v := substring(sess_field FROM 8);
        END IF;

        INSERT INTO public.sps_sessions (
          program_id, session_key, session_kind, title, staff_notes, display_order
        )
        VALUES (
          new_prog_id,
          session_key_v,
          session_kind_v,
          NULLIF(sess_data->>'title', ''),
          NULLIF(sess_data->>'staffNotes', ''),
          sess_idx
        )
        RETURNING id INTO new_sess_id;

        ex_idx := 0;
        FOR ex IN SELECT * FROM jsonb_array_elements(sess_data->'exercises') LOOP
          INSERT INTO public.sps_exercises (
            session_id, name, description, reps, sets, load, recovery_time, video_url, display_order
          )
          VALUES (
            new_sess_id,
            COALESCE(ex->>'name', ''),
            NULLIF(ex->>'description', ''),
            NULLIF(COALESCE(ex->>'reps', ex->>'repetitions'), ''),
            NULLIF(ex->>'sets', ''),
            NULLIF(ex->>'load', ''),
            NULLIF(COALESCE(ex->>'recoveryTime', ex->>'recovery_time', ex->>'rest'), ''),
            NULLIF(COALESCE(ex->>'videoUrl', ex->>'video_url'), ''),
            ex_idx
          );
          ex_idx := ex_idx + 1;
        END LOOP;

        sess_idx := sess_idx + 1;
      END IF;
    END LOOP;
  END LOOP;
END
$migrate$;