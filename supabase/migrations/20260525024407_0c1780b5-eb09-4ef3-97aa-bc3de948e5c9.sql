-- Forecast monthly overrides and one-off lines
CREATE TABLE public.investor_forecast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('revenue','spend','extra_income','extra_expense')),
  month date NOT NULL,
  label text,
  amount_gbp numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_investor_forecast_kind_month ON public.investor_forecast(kind, month);

ALTER TABLE public.investor_forecast ENABLE ROW LEVEL SECURITY;

-- All writes flow through the investor-write edge function (service role).
-- No public policies = denied for anon/authenticated. Service role bypasses RLS.

CREATE TRIGGER trg_investor_forecast_updated
BEFORE UPDATE ON public.investor_forecast
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Settings singleton
CREATE TABLE public.investor_forecast_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planned_monthly_spend_gbp numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investor_forecast_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_investor_forecast_settings_updated
BEFORE UPDATE ON public.investor_forecast_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a single settings row so updates are simple
INSERT INTO public.investor_forecast_settings (planned_monthly_spend_gbp) VALUES (0);