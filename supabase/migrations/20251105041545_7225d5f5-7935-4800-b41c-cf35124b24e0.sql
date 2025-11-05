-- Create table for club network contacts
CREATE TABLE public.club_network_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  club_name TEXT,
  position TEXT,
  email TEXT,
  phone TEXT,
  country TEXT,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.club_network_contacts ENABLE ROW LEVEL SECURITY;

-- Admin can manage all contacts
CREATE POLICY "Admin can manage club network contacts"
ON public.club_network_contacts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view all contacts
CREATE POLICY "Staff can view club network contacts"
ON public.club_network_contacts
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_club_network_contacts_updated_at
BEFORE UPDATE ON public.club_network_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();