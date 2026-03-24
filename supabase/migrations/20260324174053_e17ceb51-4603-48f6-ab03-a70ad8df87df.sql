ALTER TABLE public.performance_report_actions ADD COLUMN IF NOT EXISTS clip_start double precision;
ALTER TABLE public.performance_report_actions ADD COLUMN IF NOT EXISTS clip_end double precision;