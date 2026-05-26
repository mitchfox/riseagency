CREATE OR REPLACE FUNCTION public.get_player_visible_availability(_player_id uuid)
 RETURNS TABLE(staff_id uuid, staff_name text, availability_date date, start_time time without time zone, end_time time without time zone, source text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d DATE;
  s RECORD;
  busy RECORD;
  cursor_time TIME;
  day_end TIME := '21:00';
  day_start TIME := '09:00';
BEGIN
  FOR s IN
    SELECT DISTINCT p.id AS staff_id, COALESCE(p.full_name, 'Coach') AS staff_name
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE ur.role IN ('admin', 'staff')
      AND lower(coalesce(p.full_name, '')) LIKE 'jolon%'
  LOOP
    RETURN QUERY
    SELECT s.staff_id, s.staff_name, sa.availability_date, sa.start_time, sa.end_time, 'manual'::text
    FROM public.staff_availability sa
    WHERE sa.staff_id = s.staff_id
      AND sa.availability_date >= CURRENT_DATE
      AND sa.availability_date <= CURRENT_DATE + INTERVAL '7 days'
      AND COALESCE(sa.visible_to_players, true) = true;

    FOR d IN
      SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', INTERVAL '1 day')::date
    LOOP
      cursor_time := day_start;
      FOR busy IN
        SELECT psi.start_time AS bs, psi.end_time AS be
        FROM public.staff_personal_schedule_items psi
        WHERE psi.user_id = s.staff_id
          AND psi.scheduled_date = d
          AND psi.start_time < day_end
          AND psi.end_time > day_start
        ORDER BY psi.start_time
      LOOP
        IF busy.bs > cursor_time THEN
          RETURN QUERY SELECT s.staff_id, s.staff_name, d,
                              cursor_time,
                              LEAST(busy.bs, day_end),
                              'auto'::text;
        END IF;
        IF busy.be > cursor_time THEN
          cursor_time := busy.be;
        END IF;
        IF cursor_time >= day_end THEN EXIT; END IF;
      END LOOP;
      IF cursor_time < day_end THEN
        RETURN QUERY SELECT s.staff_id, s.staff_name, d, cursor_time, day_end, 'auto'::text;
      END IF;
    END LOOP;
  END LOOP;
END;
$function$;