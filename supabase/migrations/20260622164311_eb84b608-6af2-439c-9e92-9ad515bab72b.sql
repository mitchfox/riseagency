
CREATE OR REPLACE FUNCTION public.sync_sps_program_to_legacy(_sps_program_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prog RECORD;
  legacy_id uuid;
  sessions_jsonb jsonb := '{}'::jsonb;
  sess RECORD;
  exercises_jsonb jsonb;
  field_name text;
  existing_sessions jsonb;
BEGIN
  SELECT * INTO prog FROM public.sps_programs WHERE id = _sps_program_id;
  IF NOT FOUND THEN RETURN; END IF;

  legacy_id := prog.legacy_player_program_id;

  FOR sess IN
    SELECT * FROM public.sps_sessions WHERE program_id = _sps_program_id
    ORDER BY display_order
  LOOP
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'name', COALESCE(e.name, ''),
        'description', COALESCE(e.description, ''),
        'reps', COALESCE(e.reps, ''),
        'repetitions', COALESCE(e.reps, ''),
        'sets', COALESCE(e.sets, ''),
        'load', COALESCE(e.load, ''),
        'recoveryTime', COALESCE(e.recovery_time, ''),
        'videoUrl', COALESCE(e.video_url, '')
      )
      ORDER BY e.display_order
    ), '[]'::jsonb)
    INTO exercises_jsonb
    FROM public.sps_exercises e WHERE e.session_id = sess.id;

    IF sess.session_kind = 'pre' THEN
      field_name := 'preSession' || sess.session_key;
    ELSE
      field_name := 'session' || sess.session_key;
    END IF;

    sessions_jsonb := sessions_jsonb || jsonb_build_object(
      field_name,
      jsonb_build_object(
        'title', COALESCE(sess.title, ''),
        'staffNotes', COALESCE(sess.staff_notes, ''),
        'exercises', exercises_jsonb
      )
    );
  END LOOP;

  IF legacy_id IS NULL THEN
    INSERT INTO public.player_programs (
      player_id, program_name, phase_name, end_date, overview_text,
      is_current, display_order, linked_week_ids, sessions
    )
    VALUES (
      prog.player_id,
      prog.program_name,
      prog.phase_name,
      prog.end_date,
      prog.overview_text,
      prog.is_current,
      prog.display_order,
      prog.linked_week_ids,
      sessions_jsonb
    )
    RETURNING id INTO legacy_id;

    UPDATE public.sps_programs SET legacy_player_program_id = legacy_id WHERE id = _sps_program_id;
  ELSE
    -- Preserve any sessions content the staff have entered via the legacy editor
    -- when the new sps_sessions side is empty. Without this guard, any update
    -- to dates / metadata on the sps_programs row wipes the legacy JSONB.
    SELECT sessions INTO existing_sessions FROM public.player_programs WHERE id = legacy_id;

    IF sessions_jsonb = '{}'::jsonb
       AND existing_sessions IS NOT NULL
       AND existing_sessions <> '{}'::jsonb THEN
      UPDATE public.player_programs SET
        program_name = prog.program_name,
        phase_name = prog.phase_name,
        end_date = prog.end_date,
        overview_text = prog.overview_text,
        is_current = prog.is_current,
        display_order = prog.display_order,
        linked_week_ids = prog.linked_week_ids,
        updated_at = now()
      WHERE id = legacy_id;
    ELSE
      UPDATE public.player_programs SET
        program_name = prog.program_name,
        phase_name = prog.phase_name,
        end_date = prog.end_date,
        overview_text = prog.overview_text,
        is_current = prog.is_current,
        display_order = prog.display_order,
        linked_week_ids = prog.linked_week_ids,
        sessions = sessions_jsonb,
        updated_at = now()
      WHERE id = legacy_id;
    END IF;
  END IF;
END;
$function$;
