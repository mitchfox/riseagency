-- Add payment tracking columns to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS converted_amount numeric;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS converted_currency text;

-- Add preferred currency to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'GBP';