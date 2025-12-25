-- Create site_text table for managing all text content on the site
CREATE TABLE public.site_text (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_name TEXT NOT NULL,
  section_name TEXT,
  text_key TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  english_text TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_name, text_key)
);

-- Enable RLS
ALTER TABLE public.site_text ENABLE ROW LEVEL SECURITY;

-- Staff can view site text
CREATE POLICY "Staff can view site_text"
ON public.site_text
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Admin can manage site text
CREATE POLICY "Admin can manage site_text"
ON public.site_text
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_site_text_updated_at
BEFORE UPDATE ON public.site_text
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_site_text_page ON public.site_text(page_name);
CREATE INDEX idx_site_text_order ON public.site_text(page_name, display_order);