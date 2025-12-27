-- Add contribution_type and notes columns to scouting_reports table
ALTER TABLE public.scouting_reports 
ADD COLUMN IF NOT EXISTS contribution_type TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;