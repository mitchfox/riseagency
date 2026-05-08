
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS identification_description text,
  ADD COLUMN IF NOT EXISTS identification_reference_image_url text,
  ADD COLUMN IF NOT EXISTS not_to_confuse_with text;

CREATE TABLE IF NOT EXISTS public.ai_detection_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  action_type text,
  feedback_type text NOT NULL CHECK (feedback_type IN ('wrong_player','wrong_action','not_involved','confirmed')),
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_detection_feedback_player_action
  ON public.ai_detection_feedback (player_id, action_type, created_at DESC);

ALTER TABLE public.ai_detection_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can read AI detection feedback"
  ON public.ai_detection_feedback
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

CREATE POLICY "Authenticated staff can write AI detection feedback"
  ON public.ai_detection_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

CREATE POLICY "Authenticated staff can delete AI detection feedback"
  ON public.ai_detection_feedback
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );
