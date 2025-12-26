-- Create club_ratings table
CREATE TABLE public.club_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_name TEXT NOT NULL,
  country TEXT NOT NULL,
  first_team_rating TEXT NOT NULL DEFAULT 'R1',
  academy_rating TEXT NOT NULL DEFAULT 'R1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_name, country)
);

-- Enable RLS
ALTER TABLE public.club_ratings ENABLE ROW LEVEL SECURITY;

-- Staff can manage club ratings
CREATE POLICY "Staff can manage club_ratings"
ON public.club_ratings
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_club_ratings_updated_at
BEFORE UPDATE ON public.club_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial ratings for all clubs from club_map_positions
INSERT INTO public.club_ratings (club_name, country, first_team_rating, academy_rating)
SELECT DISTINCT club_name, COALESCE(country, 'Unknown'), 'R1', 'R1'
FROM public.club_map_positions
WHERE club_name IS NOT NULL
ON CONFLICT (club_name, country) DO NOTHING;