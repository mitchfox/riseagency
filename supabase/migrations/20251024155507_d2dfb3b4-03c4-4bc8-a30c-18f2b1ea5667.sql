-- Add representation_status column to players table
ALTER TABLE public.players 
ADD COLUMN representation_status text DEFAULT 'other' CHECK (representation_status IN ('represented', 'mandated', 'other'));