
DO $$
DECLARE
  prog RECORD;
  week_count int;
  week_idx int;
  week_json jsonb;
  new_week_id uuid;
  day_name text;
  day_val text;
  slot jsonb;
  sps_field text;
  tech_session_id uuid;
  days text[] := ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  slots_obj jsonb;
BEGIN
  -- SPS programmes
  FOR prog IN
    SELECT id, player_id, weekly_schedules
    FROM public.player_programs
    WHERE weekly_schedules IS NOT NULL
      AND jsonb_typeof(weekly_schedules) = 'array'
      AND jsonb_array_length(weekly_schedules) > 0
      AND coalesce(array_length(linked_week_ids, 1), 0) = 0
  LOOP
    week_count := jsonb_array_length(prog.weekly_schedules);
    FOR week_idx IN 0..(week_count - 1) LOOP
      week_json := prog.weekly_schedules -> week_idx;
      slots_obj := '{}'::jsonb;
      FOREACH day_name IN ARRAY days LOOP
        day_val := trim(coalesce(week_json ->> day_name, ''));
        IF day_val = '' THEN CONTINUE; END IF;
        IF upper(day_val) ~ '^[A-H]$' THEN
          sps_field := 'session' || upper(day_val);
          slot := jsonb_build_object('refId', 'sps:' || prog.id || ':' || sps_field);
        ELSIF upper(day_val) ~ '^PRE-[A-H]$' THEN
          sps_field := 'preSession' || substring(upper(day_val) from 5 for 1);
          slot := jsonb_build_object('refId', 'sps:' || prog.id || ':' || sps_field);
        ELSE
          slot := jsonb_build_object('free_text', day_val);
        END IF;
        slots_obj := slots_obj || jsonb_build_object(day_name, slot);
      END LOOP;

      INSERT INTO public.programming_weeks (player_id, label, week_start_date, display_order, slots)
      VALUES (
        prog.player_id,
        coalesce(nullif(week_json ->> 'week', ''), 'Week ' || (week_idx + 1)),
        nullif(week_json ->> 'week_start_date', '')::date,
        week_idx,
        slots_obj
      )
      RETURNING id INTO new_week_id;

      UPDATE public.player_programs
        SET linked_week_ids = array_append(linked_week_ids, new_week_id)
        WHERE id = prog.id;
    END LOOP;
  END LOOP;

  -- Technical programmes
  FOR prog IN
    SELECT id, player_id, weekly_schedules
    FROM public.technical_programs
    WHERE weekly_schedules IS NOT NULL
      AND jsonb_typeof(weekly_schedules) = 'array'
      AND jsonb_array_length(weekly_schedules) > 0
      AND coalesce(array_length(linked_week_ids, 1), 0) = 0
  LOOP
    week_count := jsonb_array_length(prog.weekly_schedules);
    FOR week_idx IN 0..(week_count - 1) LOOP
      week_json := prog.weekly_schedules -> week_idx;
      slots_obj := '{}'::jsonb;
      FOREACH day_name IN ARRAY days LOOP
        day_val := trim(coalesce(week_json ->> day_name, ''));
        IF day_val = '' THEN CONTINUE; END IF;
        tech_session_id := NULL;
        SELECT id INTO tech_session_id
          FROM public.technical_sessions
          WHERE program_id = prog.id AND upper(session_key) = upper(day_val)
          LIMIT 1;
        IF tech_session_id IS NOT NULL THEN
          slot := jsonb_build_object('refId', 'tech:' || tech_session_id);
        ELSE
          slot := jsonb_build_object('free_text', day_val);
        END IF;
        slots_obj := slots_obj || jsonb_build_object(day_name, slot);
      END LOOP;

      INSERT INTO public.programming_weeks (player_id, label, week_start_date, display_order, slots)
      VALUES (
        prog.player_id,
        coalesce(nullif(week_json ->> 'week', ''), 'Week ' || (week_idx + 1)),
        nullif(week_json ->> 'week_start_date', '')::date,
        week_idx,
        slots_obj
      )
      RETURNING id INTO new_week_id;

      UPDATE public.technical_programs
        SET linked_week_ids = array_append(linked_week_ids, new_week_id)
        WHERE id = prog.id;
    END LOOP;
  END LOOP;
END $$;
