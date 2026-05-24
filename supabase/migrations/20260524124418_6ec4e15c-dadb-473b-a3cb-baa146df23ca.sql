
ALTER TABLE public.investor_capacity_allocations
  ADD COLUMN IF NOT EXISTS assigned_staff jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.investor_projections
  ADD COLUMN IF NOT EXISTS extra_income_rows jsonb NOT NULL DEFAULT '[]'::jsonb;
