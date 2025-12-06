-- Create positional_guides table
CREATE TABLE public.positional_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position TEXT NOT NULL, -- GK, CB, FB, CDM, CM, CAM, W, CF
  phase TEXT NOT NULL, -- Defensive Transition, Defence, Offensive Transition, Offence, Intangibles
  subcategory TEXT NOT NULL, -- Off-Ball Movement, On-Ball Decision-Making, etc.
  content TEXT, -- Bullet points/guide content
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.positional_guides ENABLE ROW LEVEL SECURITY;

-- Staff can manage all positional guides
CREATE POLICY "Staff can manage positional_guides"
ON public.positional_guides
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view (for player portal)
CREATE POLICY "Authenticated users can view positional_guides"
ON public.positional_guides
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_positional_guides_position ON public.positional_guides(position);
CREATE INDEX idx_positional_guides_phase ON public.positional_guides(position, phase);