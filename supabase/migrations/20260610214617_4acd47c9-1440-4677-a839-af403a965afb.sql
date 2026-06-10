CREATE OR REPLACE FUNCTION public.validate_program_day_unique()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pid uuid;
  sched jsonb;
  day_name text;
  this_week text;
  this_week_start text;
  conflict_name text;
  day_names text[] := ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  this_val text;
BEGIN
  pid := NEW.player_id;
  IF NEW.weekly_schedules IS NULL OR jsonb_typeof(NEW.weekly_schedules) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR sched IN SELECT value FROM jsonb_array_elements(NEW.weekly_schedules) AS t(value)
  LOOP
    this_week := sched->>'week';
    this_week_start := sched->>'week_start_date';
    IF this_week IS NULL AND this_week_start IS NULL THEN CONTINUE; END IF;

    FOREACH day_name IN ARRAY day_names
    LOOP
      -- read day value (string form) OR nested days->day->session
      this_val := coalesce(sched->>day_name, sched->'days'->day_name->>'session', '');
      IF this_val = '' THEN CONTINUE; END IF;

      IF TG_TABLE_NAME = 'technical_programs' THEN
        SELECT pp.program_name INTO conflict_name
        FROM public.player_programs pp,
             jsonb_array_elements(pp.weekly_schedules) AS s
        WHERE pp.player_id = pid
          AND pp.id IS DISTINCT FROM NEW.id
          AND (
                (this_week IS NOT NULL AND s->>'week' = this_week)
             OR (this_week_start IS NOT NULL AND s->>'week_start_date' = this_week_start)
          )
          AND coalesce(s->>day_name, s->'days'->day_name->>'session', '') <> ''
        LIMIT 1;
      ELSE
        SELECT tp.program_name INTO conflict_name
        FROM public.technical_programs tp,
             jsonb_array_elements(tp.weekly_schedules) AS s
        WHERE tp.player_id = pid
          AND tp.id IS DISTINCT FROM NEW.id
          AND (
                (this_week IS NOT NULL AND s->>'week' = this_week)
             OR (this_week_start IS NOT NULL AND s->>'week_start_date' = this_week_start)
          )
          AND coalesce(s->>day_name, s->'days'->day_name->>'session', '') <> ''
        LIMIT 1;
      END IF;

      IF conflict_name IS NOT NULL THEN
        RAISE EXCEPTION 'Schedule clash on % (%): day already used by programme "%"',
          coalesce(this_week, this_week_start), day_name, conflict_name;
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on player_programs too so SPS edits also enforce uniqueness
DROP TRIGGER IF EXISTS trg_player_programs_day_unique ON public.player_programs;
CREATE TRIGGER trg_player_programs_day_unique
  BEFORE INSERT OR UPDATE OF weekly_schedules ON public.player_programs
  FOR EACH ROW EXECUTE FUNCTION public.validate_program_day_unique();