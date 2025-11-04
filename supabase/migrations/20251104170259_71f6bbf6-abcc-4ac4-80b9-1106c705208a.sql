-- Add links field to players table to store external links like Transfermarkt
ALTER TABLE public.players 
ADD COLUMN links jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.players.links IS 'Array of external links with label and url, e.g. [{"label": "Transfermarkt", "url": "https://..."}]';