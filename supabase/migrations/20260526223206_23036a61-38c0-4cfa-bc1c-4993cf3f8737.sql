ALTER TABLE public.staff_personal_schedule_items
  ADD COLUMN IF NOT EXISTS recurring_weekly BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_group_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_sps_recurrence_group
  ON public.staff_personal_schedule_items(recurrence_group_id);

ALTER TABLE public.player_portal_settings
  ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL;

CREATE OR REPLACE FUNCTION public.bump_player_portal_login(_player_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.player_portal_settings (player_id, login_count, last_login_at)
  VALUES (_player_id, 1, now())
  ON CONFLICT (player_id) DO UPDATE
  SET login_count = COALESCE(public.player_portal_settings.login_count, 0) + 1,
      last_login_at = now(),
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_player_portal_login(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_player_visible_availability(_player_id UUID)
RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  availability_date DATE,
  start_time TIME,
  end_time TIME,
  source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_player_visible_availability(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_players_by_portal_logins()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  image_url TEXT,
  login_count INTEGER,
  last_login_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id,
         p.name,
         p.email,
         p.image_url,
         COALESCE(pps.login_count, 0) AS login_count,
         pps.last_login_at
  FROM public.players p
  LEFT JOIN public.player_portal_settings pps ON pps.player_id = p.id
  WHERE COALESCE(p.representation_status, '') NOT IN ('Scouted', 'Fuel For Football')
  ORDER BY COALESCE(pps.login_count, 0) DESC,
           pps.last_login_at DESC NULLS LAST,
           p.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_players_by_portal_logins() TO authenticated;