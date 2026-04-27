ALTER TABLE public.marketing_schedule_items
ADD COLUMN IF NOT EXISTS last_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS completion_log timestamptz[] DEFAULT '{}';