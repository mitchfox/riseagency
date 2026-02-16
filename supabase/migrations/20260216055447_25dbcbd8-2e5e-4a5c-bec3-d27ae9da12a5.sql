
-- Add video analysis clip reference to performance report actions
ALTER TABLE public.performance_report_actions
ADD COLUMN IF NOT EXISTS video_analysis_id uuid REFERENCES public.video_analyses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS clip_id text;

-- Add match_minute_offset to video_analyses for timestamp override
ALTER TABLE public.video_analyses
ADD COLUMN IF NOT EXISTS match_minute_offset numeric DEFAULT 0;
