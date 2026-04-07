ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS deadline timestamptz;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS recurrence_label text;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS last_completed_at timestamptz;