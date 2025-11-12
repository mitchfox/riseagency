-- Create playlists table for player highlight playlists
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  name TEXT NOT NULL,
  clips JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Allow players to view their own playlists
CREATE POLICY "Players can view their own playlists"
ON public.playlists
FOR SELECT
USING (
  player_id IN (
    SELECT id FROM players WHERE email = auth.jwt() ->> 'email'
  )
);

-- Allow players to create their own playlists
CREATE POLICY "Players can create their own playlists"
ON public.playlists
FOR INSERT
WITH CHECK (
  player_id IN (
    SELECT id FROM players WHERE email = auth.jwt() ->> 'email'
  )
);

-- Allow players to update their own playlists
CREATE POLICY "Players can update their own playlists"
ON public.playlists
FOR UPDATE
USING (
  player_id IN (
    SELECT id FROM players WHERE email = auth.jwt() ->> 'email'
  )
);

-- Allow players to delete their own playlists
CREATE POLICY "Players can delete their own playlists"
ON public.playlists
FOR DELETE
USING (
  player_id IN (
    SELECT id FROM players WHERE email = auth.jwt() ->> 'email'
  )
);

-- Allow staff to view all playlists
CREATE POLICY "Staff can view all playlists"
ON public.playlists
FOR SELECT
USING (
  has_role(auth.uid(), 'staff'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admin to manage all playlists
CREATE POLICY "Admin can manage all playlists"
ON public.playlists
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();