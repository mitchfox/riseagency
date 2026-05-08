ALTER TABLE public.dataset_frames
  ADD COLUMN IF NOT EXISTS roboflow_uploaded_at TIMESTAMPTZ;