
CREATE TABLE public.corporation_tax_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'contractor', 'director')),
  accounting_period_start DATE NOT NULL DEFAULT '2025-01-01',
  accounting_period_end DATE NOT NULL DEFAULT '2025-12-31',
  gross_salary NUMERIC DEFAULT 0,
  employer_ni NUMERIC DEFAULT 0,
  employer_pension NUMERIC DEFAULT 0,
  contractor_fees NUMERIC DEFAULT 0,
  service_type TEXT,
  dividends NUMERIC DEFAULT 0,
  director_loan_balance NUMERIC DEFAULT 0,
  benefits_in_kind NUMERIC DEFAULT 0,
  allowable_adjustment NUMERIC DEFAULT 0,
  disallowable_portion NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.corporation_tax_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tax records"
ON public.corporation_tax_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create tax records"
ON public.corporation_tax_records FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tax records"
ON public.corporation_tax_records FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete tax records"
ON public.corporation_tax_records FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_corporation_tax_records_updated_at
BEFORE UPDATE ON public.corporation_tax_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
