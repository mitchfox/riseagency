-- Create table for custom marketing resources
CREATE TABLE public.custom_marketing_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL DEFAULT 'link',
  url TEXT,
  content TEXT,
  table_data JSONB,
  icon TEXT DEFAULT 'FileText',
  color TEXT DEFAULT 'text-gray-500',
  display_order INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_marketing_resources ENABLE ROW LEVEL SECURITY;

-- Allow all to view
CREATE POLICY "Anyone can view marketing resources"
ON public.custom_marketing_resources
FOR SELECT
USING (true);

-- Allow all to insert/update/delete (managed by app-level checks)
CREATE POLICY "Staff can manage marketing resources"
ON public.custom_marketing_resources
FOR ALL
USING (true);

-- Create scheduled_posts table for the new Schedule feature
CREATE TABLE public.scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  post_type TEXT NOT NULL DEFAULT 'single',
  platforms TEXT[] DEFAULT '{}',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  recurring_pattern TEXT,
  recurring_days TEXT[],
  series_count INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'scheduled',
  canva_link TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Allow all to view
CREATE POLICY "Anyone can view scheduled posts"
ON public.scheduled_posts
FOR SELECT
USING (true);

-- Allow all to manage (app-level permission checks)
CREATE POLICY "Staff can manage scheduled posts"
ON public.scheduled_posts
FOR ALL
USING (true);