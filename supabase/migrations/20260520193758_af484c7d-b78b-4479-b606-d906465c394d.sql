ALTER TABLE public.exec_support_items
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id text;

ALTER TABLE public.exec_support_replies
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by_label text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_exec_support_items_source
  ON public.exec_support_items(kind, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exec_support_replies_status
  ON public.exec_support_replies(item_id, status, created_at);