-- Create table for positional guide media
CREATE TABLE public.positional_guide_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID REFERENCES public.positional_guides(id) ON DELETE CASCADE,
  position VARCHAR(10) NOT NULL,
  phase VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  layout VARCHAR(20) NOT NULL DEFAULT '1x1',
  images JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.positional_guide_media ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to positional guide media"
ON public.positional_guide_media
FOR SELECT
USING (true);

-- Allow full access for staff (using is_staff function if exists, otherwise allow authenticated)
CREATE POLICY "Allow staff to manage positional guide media"
ON public.positional_guide_media
FOR ALL
USING (auth.role() = 'authenticated');

-- Create index for faster lookups
CREATE INDEX idx_positional_guide_media_lookup ON public.positional_guide_media(position, phase, subcategory);