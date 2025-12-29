-- Create table for player nutrition programs
CREATE TABLE public.player_nutrition_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  
  -- Phase information
  phase_name TEXT NOT NULL,
  diet_framework TEXT,
  weekly_structure TEXT,
  key_additions TEXT,
  overview TEXT,
  is_current BOOLEAN DEFAULT false,
  
  -- Key Macros (base values)
  calories TEXT,
  carbohydrates TEXT,
  protein TEXT,
  fat TEXT,
  
  -- Key Micros
  micro_1_name TEXT,
  micro_1_amount TEXT,
  micro_2_name TEXT,
  micro_2_amount TEXT,
  
  -- Supplements
  supplement_1_name TEXT,
  supplement_1_amount TEXT,
  supplement_2_name TEXT,
  supplement_2_amount TEXT,
  supplement_3_name TEXT,
  supplement_3_amount TEXT,
  
  -- Training Day
  training_day_overview TEXT,
  training_day_timings TEXT,
  calories_training_day TEXT,
  carbs_training_day TEXT,
  protein_training_day TEXT,
  fat_training_day TEXT,
  
  -- Match Day
  match_day_overview TEXT,
  pre_match_timings TEXT,
  in_match_timings TEXT,
  post_match_timings TEXT,
  calories_match_day TEXT,
  carbs_match_day TEXT,
  protein_match_day TEXT,
  fat_match_day TEXT,
  
  -- Recovery Day
  recovery_day_overview TEXT,
  recovery_day_timings TEXT,
  calories_recovery_day TEXT,
  carbs_recovery_day TEXT,
  protein_recovery_day TEXT,
  fat_recovery_day TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_nutrition_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Staff and admin can manage all nutrition programs
CREATE POLICY "Staff can view all nutrition programs"
ON public.player_nutrition_programs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('staff', 'admin')
  )
);

CREATE POLICY "Staff can insert nutrition programs"
ON public.player_nutrition_programs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('staff', 'admin')
  )
);

CREATE POLICY "Staff can update nutrition programs"
ON public.player_nutrition_programs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('staff', 'admin')
  )
);

CREATE POLICY "Staff can delete nutrition programs"
ON public.player_nutrition_programs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('staff', 'admin')
  )
);

-- Players can view their own nutrition programs (for portal access)
CREATE POLICY "Players can view their own nutrition programs"
ON public.player_nutrition_programs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players
    WHERE players.id = player_nutrition_programs.player_id
    AND players.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Index for faster lookups
CREATE INDEX idx_nutrition_programs_player_id ON public.player_nutrition_programs(player_id);
CREATE INDEX idx_nutrition_programs_is_current ON public.player_nutrition_programs(is_current);

-- Trigger for updated_at
CREATE TRIGGER update_nutrition_programs_updated_at
BEFORE UPDATE ON public.player_nutrition_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();