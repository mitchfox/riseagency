-- Remove all RLS policies on player_club_submissions and just disable RLS
-- The app already controls access via player_id filtering

DROP POLICY IF EXISTS "Anyone can insert player_club_submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Anyone can view player_club_submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Anyone can update player_club_submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Anyone can delete player_club_submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Staff can manage all player_club_submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Staff can view all player_club_submissions" ON public.player_club_submissions;

-- Disable RLS entirely on this table
ALTER TABLE public.player_club_submissions DISABLE ROW LEVEL SECURITY;