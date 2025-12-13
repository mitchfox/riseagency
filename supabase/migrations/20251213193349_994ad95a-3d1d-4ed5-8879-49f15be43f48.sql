-- Create open_access_issues table for monthly magazine issues
CREATE TABLE public.open_access_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month DATE NOT NULL,
  canva_draft_link TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create open_access_pages table for individual pages
CREATE TABLE public.open_access_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES public.open_access_issues(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.open_access_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_access_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies for open_access_issues
CREATE POLICY "Staff can manage open_access_issues"
ON public.open_access_issues
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view published open_access_issues"
ON public.open_access_issues
FOR SELECT
USING (published = true);

-- RLS policies for open_access_pages
CREATE POLICY "Staff can manage open_access_pages"
ON public.open_access_pages
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view pages of published issues"
ON public.open_access_pages
FOR SELECT
USING (
  issue_id IN (
    SELECT id FROM public.open_access_issues WHERE published = true
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_open_access_issues_updated_at
  BEFORE UPDATE ON public.open_access_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();