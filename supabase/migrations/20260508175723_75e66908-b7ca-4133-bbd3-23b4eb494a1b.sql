ALTER TABLE public.ai_detection_feedback
  ADD COLUMN IF NOT EXISTS expected_timestamp numeric,
  ADD COLUMN IF NOT EXISTS detected_timestamp numeric,
  ADD COLUMN IF NOT EXISTS video_analysis_id uuid REFERENCES public.video_analyses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS feedback_context jsonb;

ALTER TABLE public.ai_detection_feedback
  DROP CONSTRAINT IF EXISTS ai_detection_feedback_feedback_type_check;

ALTER TABLE public.ai_detection_feedback
  ADD CONSTRAINT ai_detection_feedback_feedback_type_check
  CHECK (feedback_type IN ('wrong_player','wrong_action','not_involved','confirmed','missed_detection','timing_mismatch'));

CREATE INDEX IF NOT EXISTS idx_ai_detection_feedback_video_analysis
  ON public.ai_detection_feedback (video_analysis_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_detection_feedback_type
  ON public.ai_detection_feedback (feedback_type, created_at DESC);