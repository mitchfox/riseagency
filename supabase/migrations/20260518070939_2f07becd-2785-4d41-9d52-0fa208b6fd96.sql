
ALTER TABLE public.investor_spending
  ADD COLUMN IF NOT EXISTS is_personal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_transaction_id uuid;

CREATE TABLE IF NOT EXISTS public.investor_bank_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'truelayer',
  bank_name text,
  account_label text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.investor_bank_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny anon access to bank connections" ON public.investor_bank_connections;
CREATE POLICY "Deny anon access to bank connections"
  ON public.investor_bank_connections FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.investor_bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.investor_bank_connections(id) ON DELETE CASCADE,
  provider_transaction_id text,
  txn_date date NOT NULL,
  description text,
  merchant text,
  category text,
  amount_gbp numeric NOT NULL,
  raw jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending | approved_business | approved_personal | rejected
  decided_at timestamptz,
  decided_by uuid,
  spending_id uuid REFERENCES public.investor_spending(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, provider_transaction_id)
);
ALTER TABLE public.investor_bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny anon access to bank txns" ON public.investor_bank_transactions;
CREATE POLICY "Deny anon access to bank txns"
  ON public.investor_bank_transactions FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_bank_txn_connection_status ON public.investor_bank_transactions(connection_id, status, txn_date DESC);

DROP TRIGGER IF EXISTS update_investor_bank_connections_updated_at ON public.investor_bank_connections;
CREATE TRIGGER update_investor_bank_connections_updated_at
  BEFORE UPDATE ON public.investor_bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
