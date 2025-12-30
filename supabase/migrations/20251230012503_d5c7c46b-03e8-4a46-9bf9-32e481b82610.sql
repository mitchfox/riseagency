-- Add video_url column to performance_report_actions table for storing clip URLs per action
ALTER TABLE public.performance_report_actions
ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;