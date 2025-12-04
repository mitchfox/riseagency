-- Add billing_month column to invoices table
ALTER TABLE public.invoices ADD COLUMN billing_month text;