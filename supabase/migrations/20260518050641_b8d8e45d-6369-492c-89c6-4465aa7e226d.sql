ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS current_salary_annual numeric,
  ADD COLUMN IF NOT EXISTS expected_commission_annual numeric,
  ADD COLUMN IF NOT EXISTS commission_notes text;