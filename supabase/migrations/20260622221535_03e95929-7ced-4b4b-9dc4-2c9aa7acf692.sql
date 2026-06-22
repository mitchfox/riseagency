ALTER TABLE public.player_form_config
  ADD COLUMN IF NOT EXISTS match_by_match_default_category text;

CREATE OR REPLACE FUNCTION public.save_player_form_config(
  _player_id uuid,
  _window_size integer,
  _stats jsonb,
  _match_by_match_default_category text DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_player_profile_settings() THEN
    RAISE EXCEPTION 'Not allowed to manage player form settings';
  END IF;

  INSERT INTO public.player_form_config (player_id, window_size, stats, match_by_match_default_category, updated_at)
  VALUES (
    _player_id,
    COALESCE(_window_size, 5),
    COALESCE(_stats, '[]'::jsonb),
    NULLIF(btrim(COALESCE(_match_by_match_default_category, '')), ''),
    now()
  )
  ON CONFLICT (player_id)
  DO UPDATE SET
    window_size = EXCLUDED.window_size,
    stats = EXCLUDED.stats,
    match_by_match_default_category = EXCLUDED.match_by_match_default_category,
    updated_at = now();
END;
$function$;