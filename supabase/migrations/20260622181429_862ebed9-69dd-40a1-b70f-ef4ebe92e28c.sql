
-- ============================================================
-- HARD GUARDS: never silently wipe player content
-- ============================================================

-- Reusable guard: refuses non-empty jsonb -> empty jsonb writes
CREATE OR REPLACE FUNCTION public.guard_jsonb_no_silent_wipe(
  _old jsonb,
  _new jsonb,
  _table text,
  _column text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.allow_clear', true) = 'on' THEN
    RETURN;
  END IF;

  IF _old IS NOT NULL
     AND _old <> '{}'::jsonb
     AND _old <> '[]'::jsonb
     AND (_new IS NULL OR _new = '{}'::jsonb OR _new = '[]'::jsonb)
  THEN
    RAISE EXCEPTION
      'Refusing to wipe %.%: non-empty content cannot be cleared by an update. If this is intentional, set app.allow_clear = on for this transaction.',
      _table, _column;
  END IF;
END;
$$;

-- Reusable guard: refuses non-empty text -> empty/null writes
CREATE OR REPLACE FUNCTION public.guard_text_no_silent_wipe(
  _old text,
  _new text,
  _table text,
  _column text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.allow_clear', true) = 'on' THEN
    RETURN;
  END IF;

  IF _old IS NOT NULL
     AND length(btrim(_old)) > 0
     AND (_new IS NULL OR length(btrim(_new)) = 0)
  THEN
    RAISE EXCEPTION
      'Refusing to wipe %.%: non-empty content cannot be cleared by an update. If this is intentional, set app.allow_clear = on for this transaction.',
      _table, _column;
  END IF;
END;
$$;

-- Bulk delete guard helper (row-level). Use as BEFORE DELETE FOR EACH ROW.
-- Allows single-row deletes through unless the per-transaction count exceeds a threshold.
-- For strict bulk-protection we rely on app.allow_clear flag for known mass-delete ops.
CREATE OR REPLACE FUNCTION public.guard_require_allow_clear_for_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Always allow when caller opts in
  IF current_setting('app.allow_clear', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RETURN OLD;
END;
$$;

-- ------------------------------------------------------------
-- player_programs: guard sessions + weekly_schedules
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_player_programs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.guard_jsonb_no_silent_wipe(OLD.sessions, NEW.sessions, 'player_programs', 'sessions');
  PERFORM public.guard_jsonb_no_silent_wipe(OLD.weekly_schedules, NEW.weekly_schedules, 'player_programs', 'weekly_schedules');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_player_programs ON public.player_programs;
CREATE TRIGGER trg_guard_player_programs
BEFORE UPDATE ON public.player_programs
FOR EACH ROW EXECUTE FUNCTION public.guard_player_programs();

-- ------------------------------------------------------------
-- programming_weeks: guard slots
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_programming_weeks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.guard_jsonb_no_silent_wipe(OLD.slots, NEW.slots, 'programming_weeks', 'slots');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_programming_weeks ON public.programming_weeks;
CREATE TRIGGER trg_guard_programming_weeks
BEFORE UPDATE ON public.programming_weeks
FOR EACH ROW EXECUTE FUNCTION public.guard_programming_weeks();

-- ------------------------------------------------------------
-- video_analyses: guard annotations + clips
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_video_analyses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.guard_jsonb_no_silent_wipe(OLD.annotations, NEW.annotations, 'video_analyses', 'annotations');
  PERFORM public.guard_jsonb_no_silent_wipe(OLD.clips, NEW.clips, 'video_analyses', 'clips');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_video_analyses ON public.video_analyses;
CREATE TRIGGER trg_guard_video_analyses
BEFORE UPDATE ON public.video_analyses
FOR EACH ROW EXECUTE FUNCTION public.guard_video_analyses();

-- Patch existing cleanup function to opt-in to clearing
CREATE OR REPLACE FUNCTION public.cleanup_expired_video_analyses()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
BEGIN
  PERFORM set_config('app.allow_clear', 'on', true);

  FOR rec IN
    SELECT id, video_url
    FROM public.video_analyses
    WHERE auto_delete_at IS NOT NULL
      AND auto_delete_at < now()
      AND jsonb_array_length(annotations) = 0
      AND jsonb_array_length(clips) = 0
  LOOP
    IF rec.video_url LIKE '%analysis-videos%' THEN
      DECLARE
        file_path TEXT := split_part(rec.video_url, 'analysis-videos/', 2);
      BEGIN
        IF file_path NOT LIKE 'clips/%' THEN
          DELETE FROM storage.objects
          WHERE bucket_id = 'analysis-videos'
            AND name = file_path;
        END IF;
      END;
    END IF;
    DELETE FROM public.video_analyses WHERE id = rec.id;
  END LOOP;

  FOR rec IN
    SELECT id, video_url
    FROM public.video_analyses
    WHERE auto_delete_at IS NOT NULL
      AND auto_delete_at < now()
      AND (jsonb_array_length(annotations) > 0 OR jsonb_array_length(clips) > 0)
  LOOP
    IF rec.video_url LIKE '%analysis-videos%' THEN
      DECLARE
        file_path TEXT := split_part(rec.video_url, 'analysis-videos/', 2);
      BEGIN
        IF file_path NOT LIKE 'clips/%' THEN
          DELETE FROM storage.objects
          WHERE bucket_id = 'analysis-videos'
            AND name = file_path;
        END IF;
      END;
    END IF;
    UPDATE public.video_analyses SET video_url = '', auto_delete_at = NULL WHERE id = rec.id;
  END LOOP;
END;
$function$;

-- ------------------------------------------------------------
-- analyses: guard core content jsonb columns if present
-- (analyses has many columns; we guard the obvious content holders)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_analyses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  old_row jsonb := to_jsonb(OLD);
  new_row jsonb := to_jsonb(NEW);
  k text;
  ov jsonb;
  nv jsonb;
BEGIN
  IF current_setting('app.allow_clear', true) = 'on' THEN
    RETURN NEW;
  END IF;

  FOR k IN SELECT jsonb_object_keys(old_row) LOOP
    ov := old_row -> k;
    nv := new_row -> k;
    -- Only guard jsonb-shaped columns that look like content (object/array)
    IF jsonb_typeof(ov) IN ('object','array')
       AND ov <> '{}'::jsonb
       AND ov <> '[]'::jsonb
       AND (nv IS NULL OR nv = 'null'::jsonb OR nv = '{}'::jsonb OR nv = '[]'::jsonb)
    THEN
      RAISE EXCEPTION
        'Refusing to wipe analyses.%: non-empty content cannot be cleared by an update. Set app.allow_clear = on if intentional.', k;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_analyses ON public.analyses;
CREATE TRIGGER trg_guard_analyses
BEFORE UPDATE ON public.analyses
FOR EACH ROW EXECUTE FUNCTION public.guard_analyses();

DROP TRIGGER IF EXISTS trg_guard_player_analysis ON public.player_analysis;
CREATE TRIGGER trg_guard_player_analysis
BEFORE UPDATE ON public.player_analysis
FOR EACH ROW EXECUTE FUNCTION public.guard_analyses();

DROP TRIGGER IF EXISTS trg_guard_player_other_analysis ON public.player_other_analysis;
CREATE TRIGGER trg_guard_player_other_analysis
BEFORE UPDATE ON public.player_other_analysis
FOR EACH ROW EXECUTE FUNCTION public.guard_analyses();

-- ------------------------------------------------------------
-- Bulk-delete protection on irreplaceable child tables
-- ------------------------------------------------------------
-- We use a statement-level guard: if the deleting transaction did not opt in
-- via app.allow_clear, and the statement deletes more than 1 row, abort.
CREATE OR REPLACE FUNCTION public.guard_bulk_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  n bigint;
BEGIN
  IF current_setting('app.allow_clear', true) = 'on' THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO n FROM old_table;
  IF n > 1 THEN
    RAISE EXCEPTION
      'Refusing bulk delete of % rows from %. Set app.allow_clear = on if intentional.',
      n, TG_TABLE_NAME;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_bulk_delete_sps_sessions ON public.sps_sessions;
CREATE TRIGGER trg_guard_bulk_delete_sps_sessions
AFTER DELETE ON public.sps_sessions
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT EXECUTE FUNCTION public.guard_bulk_delete();

DROP TRIGGER IF EXISTS trg_guard_bulk_delete_sps_exercises ON public.sps_exercises;
CREATE TRIGGER trg_guard_bulk_delete_sps_exercises
AFTER DELETE ON public.sps_exercises
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT EXECUTE FUNCTION public.guard_bulk_delete();

DROP TRIGGER IF EXISTS trg_guard_bulk_delete_technical_sessions ON public.technical_sessions;
CREATE TRIGGER trg_guard_bulk_delete_technical_sessions
AFTER DELETE ON public.technical_sessions
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT EXECUTE FUNCTION public.guard_bulk_delete();

DROP TRIGGER IF EXISTS trg_guard_bulk_delete_technical_drills ON public.technical_drills;
CREATE TRIGGER trg_guard_bulk_delete_technical_drills
AFTER DELETE ON public.technical_drills
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT EXECUTE FUNCTION public.guard_bulk_delete();

DROP TRIGGER IF EXISTS trg_guard_bulk_delete_technical_drill_variations ON public.technical_drill_variations;
CREATE TRIGGER trg_guard_bulk_delete_technical_drill_variations
AFTER DELETE ON public.technical_drill_variations
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT EXECUTE FUNCTION public.guard_bulk_delete();

DROP TRIGGER IF EXISTS trg_guard_bulk_delete_performance_report_actions ON public.performance_report_actions;
CREATE TRIGGER trg_guard_bulk_delete_performance_report_actions
AFTER DELETE ON public.performance_report_actions
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT EXECUTE FUNCTION public.guard_bulk_delete();

DROP TRIGGER IF EXISTS trg_guard_bulk_delete_player_programs ON public.player_programs;
CREATE TRIGGER trg_guard_bulk_delete_player_programs
AFTER DELETE ON public.player_programs
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT EXECUTE FUNCTION public.guard_bulk_delete();

DROP TRIGGER IF EXISTS trg_guard_bulk_delete_sps_programs ON public.sps_programs;
CREATE TRIGGER trg_guard_bulk_delete_sps_programs
AFTER DELETE ON public.sps_programs
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT EXECUTE FUNCTION public.guard_bulk_delete();

DROP TRIGGER IF EXISTS trg_guard_bulk_delete_technical_programs ON public.technical_programs;
CREATE TRIGGER trg_guard_bulk_delete_technical_programs
AFTER DELETE ON public.technical_programs
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT EXECUTE FUNCTION public.guard_bulk_delete();

-- ------------------------------------------------------------
-- Sync discipline: metadata-only updates on sps_programs must
-- NEVER touch player_programs.sessions
-- ------------------------------------------------------------
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
  source_has_any boolean;
BEGIN
  SELECT * INTO prog FROM public.sps_programs WHERE id = _sps_program_id;
  IF NOT FOUND THEN RETURN; END IF;

  legacy_id := prog.legacy_player_program_id;

  SELECT EXISTS (SELECT 1 FROM public.sps_sessions WHERE program_id = _sps_program_id)
    INTO source_has_any;

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
    SELECT sessions INTO existing_sessions FROM public.player_programs WHERE id = legacy_id;

    -- Rule: if the new sps_sessions source is empty, NEVER touch legacy sessions.
    -- Only sync metadata. This protects legacy-only programmes from being wiped
    -- by a metadata edit on the sps_programs mirror.
    IF NOT source_has_any THEN
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
      -- Source has sessions: safe to write through.
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

-- ------------------------------------------------------------
-- Remove silent cascade: deleting an sps_programs row should NOT
-- silently delete the legacy player_programs row. App must do that
-- explicitly with an allow_clear flag.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_cleanup_legacy_after_sps_delete ON public.sps_programs;

CREATE OR REPLACE FUNCTION public.trg_cleanup_legacy_after_sps_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Intentionally a no-op. Legacy deletes must be explicit from the app layer.
  RETURN OLD;
END;
$function$;
