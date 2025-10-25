-- Create table for site visits tracking
CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  location JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  referrer TEXT,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Create policy for staff to view all visits
CREATE POLICY "Staff can view all site visits"
ON public.site_visits
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_site_visits_page_path ON public.site_visits(page_path);
CREATE INDEX idx_site_visits_visited_at ON public.site_visits(visited_at DESC);
CREATE INDEX idx_site_visits_visitor_id ON public.site_visits(visitor_id);