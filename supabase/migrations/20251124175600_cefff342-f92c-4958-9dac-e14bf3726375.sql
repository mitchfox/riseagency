-- Fix search_path for the function
DROP FUNCTION IF EXISTS update_performance_statistics_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_performance_statistics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER update_performance_statistics_updated_at
BEFORE UPDATE ON public.performance_statistics
FOR EACH ROW
EXECUTE FUNCTION update_performance_statistics_updated_at();