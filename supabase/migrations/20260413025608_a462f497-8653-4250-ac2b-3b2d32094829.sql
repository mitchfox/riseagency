ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS completion_log timestamptz[] DEFAULT '{}';