ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS has_representation_offer boolean NOT NULL DEFAULT false;

UPDATE public.players
SET has_representation_offer = true
WHERE representation_status = 'prospect';

CREATE INDEX IF NOT EXISTS idx_players_has_representation_offer
ON public.players(has_representation_offer)
WHERE has_representation_offer = true;