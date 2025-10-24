-- Add display_order to player_programs for reordering
ALTER TABLE public.player_programs 
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Update existing records with sequential order
WITH numbered_programs AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY created_at) as rn
  FROM public.player_programs
)
UPDATE public.player_programs p
SET display_order = n.rn
FROM numbered_programs n
WHERE p.id = n.id;

-- Create coaching database tables
CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  duration INTEGER, -- duration in minutes
  category TEXT,
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coaching_programmes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  weeks INTEGER,
  category TEXT,
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coaching_drills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  setup TEXT,
  equipment TEXT,
  players_required TEXT,
  category TEXT,
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coaching_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  sets INTEGER,
  reps INTEGER,
  rest_time INTEGER, -- rest in seconds
  category TEXT,
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coaching_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  analysis_type TEXT,
  category TEXT,
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.psychological_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  duration INTEGER, -- duration in minutes
  category TEXT,
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all coaching database tables
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psychological_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for coaching database (staff only)
CREATE POLICY "Staff can manage coaching sessions" 
ON public.coaching_sessions 
FOR ALL 
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage coaching programmes" 
ON public.coaching_programmes 
FOR ALL 
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage coaching drills" 
ON public.coaching_drills 
FOR ALL 
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage coaching exercises" 
ON public.coaching_exercises 
FOR ALL 
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage coaching analysis" 
ON public.coaching_analysis 
FOR ALL 
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage psychological sessions" 
ON public.psychological_sessions 
FOR ALL 
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_coaching_sessions_updated_at
BEFORE UPDATE ON public.coaching_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_programmes_updated_at
BEFORE UPDATE ON public.coaching_programmes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_drills_updated_at
BEFORE UPDATE ON public.coaching_drills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_exercises_updated_at
BEFORE UPDATE ON public.coaching_exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_analysis_updated_at
BEFORE UPDATE ON public.coaching_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_psychological_sessions_updated_at
BEFORE UPDATE ON public.psychological_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();