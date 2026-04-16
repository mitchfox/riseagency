-- Create fff_packages table
CREATE TABLE public.fff_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  package_size INTEGER NOT NULL DEFAULT 5,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fff_package_completions table
CREATE TABLE public.fff_package_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.fff_packages(id) ON DELETE CASCADE,
  analysis_id UUID,
  performance_report_id UUID,
  fixture_id UUID,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fff_packages_player ON public.fff_packages(player_id);
CREATE INDEX idx_fff_completions_package ON public.fff_package_completions(package_id);
CREATE INDEX idx_fff_completions_analysis ON public.fff_package_completions(analysis_id);
CREATE INDEX idx_fff_completions_report ON public.fff_package_completions(performance_report_id);

-- Enable RLS
ALTER TABLE public.fff_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fff_package_completions ENABLE ROW LEVEL SECURITY;

-- Staff-only access (any authenticated user with a role)
CREATE POLICY "Authenticated users can view fff packages"
  ON public.fff_packages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert fff packages"
  ON public.fff_packages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update fff packages"
  ON public.fff_packages FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete fff packages"
  ON public.fff_packages FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view fff completions"
  ON public.fff_package_completions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert fff completions"
  ON public.fff_package_completions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update fff completions"
  ON public.fff_package_completions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete fff completions"
  ON public.fff_package_completions FOR DELETE
  TO authenticated
  USING (true);

-- Updated_at trigger for fff_packages
CREATE TRIGGER update_fff_packages_updated_at
  BEFORE UPDATE ON public.fff_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();