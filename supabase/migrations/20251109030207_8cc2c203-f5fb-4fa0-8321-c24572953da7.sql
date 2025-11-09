-- Create table for R90 Ratings
CREATE TABLE public.r90_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  category TEXT,
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.r90_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for r90_ratings
CREATE POLICY "Admin can manage R90 ratings"
  ON public.r90_ratings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view R90 ratings"
  ON public.r90_ratings
  FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_r90_ratings_updated_at
  BEFORE UPDATE ON public.r90_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();