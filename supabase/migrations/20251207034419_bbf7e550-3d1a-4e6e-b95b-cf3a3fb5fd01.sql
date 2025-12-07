-- Create a new table for rich positional guide points (each point has title, paragraphs, media, video)
CREATE TABLE public.positional_guide_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position TEXT NOT NULL,
  phase TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  title TEXT NOT NULL,
  paragraphs TEXT[] DEFAULT '{}',
  image_layout TEXT DEFAULT '1-1', -- Layout options: 1-1, 2-1, 1-2, 2-2, 3-2, 3-3
  images JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.positional_guide_points ENABLE ROW LEVEL SECURITY;

-- Staff can manage
CREATE POLICY "Staff can manage positional_guide_points"
ON public.positional_guide_points
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view
CREATE POLICY "Authenticated users can view positional_guide_points"
ON public.positional_guide_points
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_positional_guide_points_position_phase ON public.positional_guide_points(position, phase, subcategory);

-- Add trigger for updated_at
CREATE TRIGGER update_positional_guide_points_updated_at
BEFORE UPDATE ON public.positional_guide_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();