-- Create fixtures table
CREATE TABLE public.fixtures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  match_date DATE NOT NULL,
  competition TEXT,
  venue TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;

-- Create policies for fixtures
CREATE POLICY "Staff can manage all fixtures"
ON public.fixtures
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view fixtures"
ON public.fixtures
FOR SELECT
USING (true);

-- Create player_fixtures junction table to link players to fixtures
CREATE TABLE public.player_fixtures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  fixture_id UUID NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  minutes_played INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, fixture_id)
);

-- Enable RLS
ALTER TABLE public.player_fixtures ENABLE ROW LEVEL SECURITY;

-- Create policies for player_fixtures
CREATE POLICY "Staff can manage player fixtures"
ON public.player_fixtures
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Players can view their own fixtures"
ON public.player_fixtures
FOR SELECT
USING (
  player_id IN (
    SELECT id FROM public.players 
    WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

-- Add fixture_id to player_analysis table
ALTER TABLE public.player_analysis
ADD COLUMN fixture_id UUID REFERENCES public.fixtures(id) ON DELETE SET NULL;

-- Add fixture_id to analyses table
ALTER TABLE public.analyses
ADD COLUMN fixture_id UUID REFERENCES public.fixtures(id) ON DELETE SET NULL;

-- Create trigger for updated_at on fixtures
CREATE TRIGGER update_fixtures_updated_at
BEFORE UPDATE ON public.fixtures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();