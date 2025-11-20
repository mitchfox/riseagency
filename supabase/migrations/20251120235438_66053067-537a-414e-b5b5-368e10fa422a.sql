-- Create table for tactical schemes
CREATE TABLE public.tactical_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position text NOT NULL,
  team_scheme text NOT NULL,
  opposition_scheme text NOT NULL,
  defensive_transition text,
  defence text,
  offensive_transition text,
  offence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tactical_schemes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage tactical schemes"
  ON public.tactical_schemes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view tactical schemes"
  ON public.tactical_schemes
  FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_tactical_schemes_updated_at
  BEFORE UPDATE ON public.tactical_schemes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();