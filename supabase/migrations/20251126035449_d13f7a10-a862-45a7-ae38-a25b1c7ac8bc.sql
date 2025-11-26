-- Create scouts table
CREATE TABLE public.scouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  country TEXT,
  regions TEXT[],
  commission_rate NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  total_submissions INTEGER NOT NULL DEFAULT 0,
  successful_signings INTEGER NOT NULL DEFAULT 0,
  profile_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scouts table
CREATE POLICY "Scouts can view their own record"
ON public.scouts
FOR SELECT
USING (email = (auth.jwt() ->> 'email'::text));

CREATE POLICY "Scouts can update their own record"
ON public.scouts
FOR UPDATE
USING (email = (auth.jwt() ->> 'email'::text));

CREATE POLICY "Staff can manage all scouts"
ON public.scouts
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage all scouts"
ON public.scouts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_scouts_updated_at
BEFORE UPDATE ON public.scouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update scouting_reports to link to scouts table
ALTER TABLE public.scouting_reports
ADD COLUMN scout_id UUID REFERENCES public.scouts(id);

-- Add RLS policy for scouts to manage their own reports
CREATE POLICY "Scouts can view their own reports"
ON public.scouting_reports
FOR SELECT
USING (scout_id IN (SELECT id FROM scouts WHERE email = (auth.jwt() ->> 'email'::text)));

CREATE POLICY "Scouts can create reports"
ON public.scouting_reports
FOR INSERT
WITH CHECK (scout_id IN (SELECT id FROM scouts WHERE email = (auth.jwt() ->> 'email'::text)));