-- Add latitude and longitude columns to club_map_positions for geo-calibration
ALTER TABLE public.club_map_positions 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS is_calibration_point boolean DEFAULT false;

-- Add comment explaining the columns
COMMENT ON COLUMN public.club_map_positions.latitude IS 'Real-world latitude coordinate';
COMMENT ON COLUMN public.club_map_positions.longitude IS 'Real-world longitude coordinate';
COMMENT ON COLUMN public.club_map_positions.is_calibration_point IS 'Whether this club was manually positioned and can be used as a reference point';