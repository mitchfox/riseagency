-- Add zone and success tracking to performance report actions
ALTER TABLE performance_report_actions 
ADD COLUMN IF NOT EXISTS zone integer CHECK (zone >= 1 AND zone <= 18),
ADD COLUMN IF NOT EXISTS is_successful boolean DEFAULT true;