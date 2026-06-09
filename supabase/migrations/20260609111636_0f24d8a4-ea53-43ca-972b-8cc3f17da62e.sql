CREATE OR REPLACE FUNCTION public.auto_assign_highlight_maker_players()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  maker_key text;
BEGIN
  maker_key := regexp_replace(
    lower(coalesce(NEW.username, '') || ' ' || coalesce(NEW.display_name, '')),
    '[^a-z0-9]',
    '',
    'g'
  );

  IF maker_key = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.highlight_maker_players (highlight_maker_id, player_id)
  SELECT DISTINCT NEW.id, p.id
  FROM public.players p
  CROSS JOIN LATERAL regexp_split_to_table(coalesce(p.name, ''), '\s+') AS part(name_part)
  WHERE length(part.name_part) >= 3
    AND position(regexp_replace(lower(part.name_part), '[^a-z0-9]', '', 'g') IN maker_key) > 0
    AND coalesce(p.category, '') NOT IN ('Scouted', 'Fuel For Football')
    AND coalesce(p.representation_status, '') NOT IN ('Scouted', 'Fuel For Football')
  ON CONFLICT (highlight_maker_id, player_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS highlight_makers_auto_assign_players ON public.highlight_makers;
CREATE TRIGGER highlight_makers_auto_assign_players
  AFTER INSERT ON public.highlight_makers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_highlight_maker_players();