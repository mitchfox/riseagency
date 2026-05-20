
-- Capacity planner: monthly mode + multi-day allocations
ALTER TABLE public.investor_capacity_settings
  ADD COLUMN IF NOT EXISTS monthly_hours_total integer NOT NULL DEFAULT 160;

ALTER TABLE public.investor_capacity_allocations
  ADD COLUMN IF NOT EXISTS days_of_week text[] NOT NULL DEFAULT '{}';
