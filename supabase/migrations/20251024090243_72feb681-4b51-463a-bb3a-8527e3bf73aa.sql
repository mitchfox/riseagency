-- Add email column to players table
ALTER TABLE public.players 
ADD COLUMN email TEXT;

-- Create index for email lookups
CREATE INDEX idx_players_email ON public.players(email);