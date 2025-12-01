-- Create dedicated table for club map positions
CREATE TABLE public.club_map_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_name TEXT NOT NULL,
  country TEXT,
  x_position NUMERIC,
  y_position NUMERIC,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.club_map_positions ENABLE ROW LEVEL SECURITY;

-- Create policies for staff access
CREATE POLICY "Staff can manage club_map_positions"
ON public.club_map_positions
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view club map positions"
ON public.club_map_positions
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage club map positions"
ON public.club_map_positions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing club data from club_network_contacts that have coordinates
INSERT INTO public.club_map_positions (club_name, country, x_position, y_position, image_url, created_at, updated_at)
SELECT 
  COALESCE(club_name, name) as club_name,
  country,
  x_position,
  y_position,
  image_url,
  created_at,
  updated_at
FROM public.club_network_contacts
WHERE x_position IS NOT NULL AND y_position IS NOT NULL;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_club_map_positions_updated_at
BEFORE UPDATE ON public.club_map_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();