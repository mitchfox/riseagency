-- Add linked_player_id column to prospects for linking to players table
ALTER TABLE public.prospects 
ADD COLUMN linked_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_prospects_linked_player ON public.prospects(linked_player_id);