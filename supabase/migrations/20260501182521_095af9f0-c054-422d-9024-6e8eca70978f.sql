ALTER TABLE public.performance_report_actions
ADD COLUMN IF NOT EXISTS is_first_half boolean NOT NULL DEFAULT false;