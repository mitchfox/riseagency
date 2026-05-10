
-- Business plan singleton table
CREATE TABLE IF NOT EXISTS public.business_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_summary TEXT DEFAULT '',
  business_description TEXT DEFAULT '',
  markets TEXT DEFAULT '',
  swot_strengths TEXT DEFAULT '',
  swot_weaknesses TEXT DEFAULT '',
  swot_opportunities TEXT DEFAULT '',
  swot_threats TEXT DEFAULT '',
  management_personnel TEXT DEFAULT '',
  products_services TEXT DEFAULT '',
  marketing TEXT DEFAULT '',
  financial_plan TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view business plan"
  ON public.business_plan FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert business plan"
  ON public.business_plan FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update business plan"
  ON public.business_plan FOR UPDATE
  TO authenticated
  USING (true);

CREATE TRIGGER business_plan_set_updated_at
  BEFORE UPDATE ON public.business_plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Video analysis jobs table
CREATE TABLE IF NOT EXISTS public.video_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  payload JSONB,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own video analysis jobs"
  ON public.video_analysis_jobs FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert their own video analysis jobs"
  ON public.video_analysis_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can update their own video analysis jobs"
  ON public.video_analysis_jobs FOR UPDATE
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE TRIGGER video_analysis_jobs_set_updated_at
  BEFORE UPDATE ON public.video_analysis_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_video_analysis_jobs_user ON public.video_analysis_jobs(user_id, created_at DESC);
