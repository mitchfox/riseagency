-- Add public read access for player_nutrition_programs 
-- This matches the pattern used by other player-related tables in this app
-- where authentication is handled via localStorage email, not Supabase Auth
CREATE POLICY "Allow public read access to nutrition programs"
ON public.player_nutrition_programs
FOR SELECT
USING (true);