-- Create table for performance statistics definitions
CREATE TABLE IF NOT EXISTS public.performance_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_name TEXT NOT NULL,
  stat_key TEXT NOT NULL UNIQUE,
  positions TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.performance_statistics ENABLE ROW LEVEL SECURITY;

-- Allow staff and admin to view statistics
CREATE POLICY "Staff can view performance statistics"
ON public.performance_statistics
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Allow admin to manage statistics
CREATE POLICY "Admin can manage performance statistics"
ON public.performance_statistics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert some common statistics
INSERT INTO public.performance_statistics (stat_name, stat_key, positions, description) VALUES
  ('Shots on Target', 'shots_on_target', ARRAY['CF', 'W', 'CAM'], 'Number of shots that were on target'),
  ('Shots off Target', 'shots_off_target', ARRAY['CF', 'W', 'CAM'], 'Number of shots that missed the target'),
  ('Dribbles', 'dribbles', ARRAY['W', 'CF', 'CAM', 'FB'], 'Number of successful dribbles'),
  ('Aerials Won', 'aerials_won', ARRAY['CF', 'CB', 'CDM'], 'Number of aerial duels won'),
  ('Tackles', 'tackles', ARRAY['FB', 'CB', 'CDM', 'CM'], 'Number of tackles made'),
  ('Interceptions', 'interceptions', ARRAY['FB', 'CB', 'CDM', 'CM'], 'Number of interceptions'),
  ('Clearances', 'clearances', ARRAY['CB', 'FB', 'CDM'], 'Number of clearances'),
  ('Saves', 'saves', ARRAY['GK'], 'Number of saves made'),
  ('Punches', 'punches', ARRAY['GK'], 'Number of punches'),
  ('High Claims', 'high_claims', ARRAY['GK'], 'Number of high claims'),
  ('Sweeper Actions', 'sweeper_actions', ARRAY['GK'], 'Number of sweeper keeper actions');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_performance_statistics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_performance_statistics_updated_at
BEFORE UPDATE ON public.performance_statistics
FOR EACH ROW
EXECUTE FUNCTION update_performance_statistics_updated_at();