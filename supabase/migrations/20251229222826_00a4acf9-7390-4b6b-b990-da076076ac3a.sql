-- Drop existing policies that reference auth.users
DROP POLICY IF EXISTS "Staff can manage all nutrition programs" ON public.player_nutrition_programs;
DROP POLICY IF EXISTS "Players can view their own nutrition programs" ON public.player_nutrition_programs;

-- Recreate policies using user_roles table instead of auth.users
CREATE POLICY "Staff can manage all nutrition programs" 
ON public.player_nutrition_programs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'staff'
  )
);

CREATE POLICY "Players can view their own nutrition programs" 
ON public.player_nutrition_programs 
FOR SELECT 
USING (
  player_id IN (
    SELECT id FROM public.players 
    WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
);