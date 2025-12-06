-- Create payments table for tracking ins and outs
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  description TEXT,
  payment_method TEXT, -- bank_transfer, card, paypal, etc.
  reference TEXT,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bank_details table for storing payment information
CREATE TABLE public.bank_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  bank_name TEXT,
  account_name TEXT,
  account_number TEXT,
  sort_code TEXT,
  iban TEXT,
  swift_bic TEXT,
  paypal_email TEXT,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('bank_transfer', 'paypal', 'card', 'other')),
  notes TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for payments
CREATE POLICY "Staff can manage payments"
ON public.payments
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Players can view their own payments"
ON public.payments
FOR SELECT
USING (player_id IN (
  SELECT id FROM players WHERE email = (auth.jwt() ->> 'email'::text)
));

-- Enable RLS on bank_details table
ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;

-- RLS policies for bank_details
CREATE POLICY "Staff can manage bank_details"
ON public.bank_details
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view bank_details"
ON public.bank_details
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create update triggers
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_details_updated_at
BEFORE UPDATE ON public.bank_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();