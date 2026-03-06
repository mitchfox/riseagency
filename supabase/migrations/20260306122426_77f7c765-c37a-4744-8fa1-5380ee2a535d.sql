CREATE OR REPLACE FUNCTION public.mark_welcome_seen(_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.player_portal_settings (player_id, has_seen_welcome_modal)
  VALUES (_player_id, true)
  ON CONFLICT (player_id)
  DO UPDATE SET
    has_seen_welcome_modal = true,
    updated_at = now();
END;
$function$;

GRANT EXECUTE ON FUNCTION public.mark_welcome_seen(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_welcome_seen(uuid) TO authenticated;