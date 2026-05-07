CREATE OR REPLACE FUNCTION public.can_manage_player_profile_settings()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role::text
      WHERE ur.user_id = auth.uid()
        AND rp.section_id = ANY (ARRAY['playerdatabase', 'players'])
        AND rp.can_edit = true
    );
$$;

CREATE OR REPLACE FUNCTION public.save_player_form_config(
  _player_id uuid,
  _window_size integer,
  _stats jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_player_profile_settings() THEN
    RAISE EXCEPTION 'Not allowed to manage player form settings';
  END IF;

  INSERT INTO public.player_form_config (player_id, window_size, stats, updated_at)
  VALUES (_player_id, COALESCE(_window_size, 5), COALESCE(_stats, '[]'::jsonb), now())
  ON CONFLICT (player_id)
  DO UPDATE SET
    window_size = EXCLUDED.window_size,
    stats = EXCLUDED.stats,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_player_hudl_visibility(
  _player_id uuid,
  _rows jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  IF NOT public.can_manage_player_profile_settings() THEN
    RAISE EXCEPTION 'Not allowed to manage Hudl visibility settings';
  END IF;

  IF _rows IS NULL OR jsonb_typeof(_rows) <> 'array' THEN
    RAISE EXCEPTION 'Hudl visibility rows must be an array';
  END IF;

  DELETE FROM public.player_hudl_visibility
  WHERE player_id = _player_id;

  INSERT INTO public.player_hudl_visibility (
    player_id,
    playlist_id,
    playlist_key,
    clip_id,
    clip_video_url,
    visible,
    sort_order,
    updated_at
  )
  SELECT
    _player_id,
    NULLIF(row_data->>'playlist_id', ''),
    NULLIF(row_data->>'playlist_key', ''),
    NULLIF(row_data->>'clip_id', ''),
    NULLIF(row_data->>'clip_video_url', ''),
    COALESCE((row_data->>'visible')::boolean, false),
    COALESCE((row_data->>'sort_order')::integer, 0),
    now()
  FROM jsonb_array_elements(_rows) AS row_data;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;