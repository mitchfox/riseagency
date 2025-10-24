-- Create player_programs table to store multiple programs per player
CREATE TABLE IF NOT EXISTS public.player_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  program_name TEXT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  phase_name TEXT,
  phase_dates TEXT,
  phase_image_url TEXT,
  player_image_url TEXT,
  overview_text TEXT,
  sessions JSONB DEFAULT '{}'::jsonb,
  weekly_schedules JSONB DEFAULT '[]'::jsonb,
  schedule_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_programs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Players can view their own programs" 
ON public.player_programs 
FOR SELECT 
USING (player_id IN (
  SELECT players.id
  FROM players
  WHERE players.email = (auth.jwt() ->> 'email'::text)
));

CREATE POLICY "Staff can manage all programs" 
ON public.player_programs 
FOR ALL 
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_player_programs_updated_at
BEFORE UPDATE ON public.player_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for player_id lookups
CREATE INDEX idx_player_programs_player_id ON public.player_programs(player_id);
CREATE INDEX idx_player_programs_is_current ON public.player_programs(player_id, is_current) WHERE is_current = true;