-- Create prospects table
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  age INTEGER,
  position TEXT,
  nationality TEXT,
  current_club TEXT,
  age_group TEXT NOT NULL CHECK (age_group IN ('A', 'B', 'C', 'D')),
  stage TEXT NOT NULL DEFAULT 'scouted' CHECK (stage IN ('scouted', 'connected', 'rapport_building', 'rising', 'rise')),
  profile_image_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  last_contact_date DATE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high'))
);

-- Enable RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Create policy for staff to manage prospects
CREATE POLICY "Staff can manage prospects"
ON public.prospects
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prospects_updated_at
BEFORE UPDATE ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for efficient querying
CREATE INDEX idx_prospects_age_group ON public.prospects(age_group);
CREATE INDEX idx_prospects_stage ON public.prospects(stage);
CREATE INDEX idx_prospects_age_group_stage ON public.prospects(age_group, stage);

-- Add comments
COMMENT ON TABLE public.prospects IS 'Tracks potential player prospects through recruitment pipeline';
COMMENT ON COLUMN public.prospects.age_group IS 'Age category: A (First Team), B (U21), C (U18), D (U16)';
COMMENT ON COLUMN public.prospects.stage IS 'Recruitment pipeline stage: scouted, connected, rapport_building, rising, rise';