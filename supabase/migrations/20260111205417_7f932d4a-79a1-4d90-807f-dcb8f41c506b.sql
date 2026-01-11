-- Create partners table for business partnerships and case studies
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  website_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  category TEXT DEFAULT 'partner',
  case_study_title TEXT,
  case_study_content TEXT,
  case_study_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Public read access for partners
CREATE POLICY "Partners are viewable by everyone" 
ON public.partners 
FOR SELECT 
USING (true);

-- Only authenticated users can manage partners
CREATE POLICY "Authenticated users can insert partners" 
ON public.partners 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update partners" 
ON public.partners 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete partners" 
ON public.partners 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Add trigger for updating updated_at
CREATE TRIGGER update_partners_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();