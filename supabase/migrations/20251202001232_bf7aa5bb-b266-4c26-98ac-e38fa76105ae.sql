-- Create table for custom formation positions
CREATE TABLE IF NOT EXISTS public.formation_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation TEXT NOT NULL UNIQUE,
  positions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.formation_positions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read formation positions
CREATE POLICY "Anyone can view formation positions"
  ON public.formation_positions
  FOR SELECT
  USING (true);

-- Only authenticated users can modify
CREATE POLICY "Authenticated users can insert formation positions"
  ON public.formation_positions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update formation positions"
  ON public.formation_positions
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER set_formation_positions_updated_at
  BEFORE UPDATE ON public.formation_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();