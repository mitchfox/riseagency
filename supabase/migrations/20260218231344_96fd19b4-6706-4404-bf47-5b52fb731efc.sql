
-- Add linked_video_analyses to player_analysis to track which video analyses are linked
ALTER TABLE public.player_analysis ADD COLUMN IF NOT EXISTS linked_video_analysis_ids TEXT[] DEFAULT '{}';
