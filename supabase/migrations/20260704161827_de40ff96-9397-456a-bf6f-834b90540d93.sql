UPDATE public.players
SET representation_status = 'other'
WHERE representation_status = 'Other';

CREATE OR REPLACE FUNCTION public.guard_players_representation_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.representation_status IS NOT NULL
     AND NEW.representation_status NOT IN (
       'represented',
       'fuel_for_football',
       'mandated',
       'previously_mandated',
       'prospect',
       'scouted',
       'other'
     ) THEN
    RAISE EXCEPTION 'Invalid representation_status value: %. Use internal RISE relationship statuses only.', NEW.representation_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_representation_status_guard ON public.players;
CREATE TRIGGER players_representation_status_guard
BEFORE INSERT OR UPDATE OF representation_status ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.guard_players_representation_status();