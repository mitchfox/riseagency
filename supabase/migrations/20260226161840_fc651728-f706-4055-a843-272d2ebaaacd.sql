-- Add linked_video_analysis_ids to analyses table (mirroring player_analysis pattern)
ALTER TABLE public.analyses 
ADD COLUMN linked_video_analysis_ids text[] DEFAULT '{}';
