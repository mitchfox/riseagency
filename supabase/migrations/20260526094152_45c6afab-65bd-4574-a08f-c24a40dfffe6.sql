CREATE OR REPLACE FUNCTION public.get_operating_profile_status(_player_id uuid)
RETURNS TABLE(submitted_at timestamptz, has_any boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    op.submitted_at,
    (op.answers IS NOT NULL
      AND jsonb_typeof(op.answers) = 'object'
      AND (SELECT count(*) FROM jsonb_object_keys(op.answers)) > 0) AS has_any
  FROM public.player_operating_profile op
  WHERE op.player_id = _player_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_operating_profile_status(uuid) TO anon, authenticated;