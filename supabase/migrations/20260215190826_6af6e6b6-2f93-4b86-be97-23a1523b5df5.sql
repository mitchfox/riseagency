
-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  vendor TEXT,
  paid_by_user_id UUID REFERENCES auth.users(id),
  paid_by_name TEXT NOT NULL,
  receipt_url TEXT,
  tax_deductible BOOLEAN NOT NULL DEFAULT true,
  reimbursed BOOLEAN NOT NULL DEFAULT false,
  reimbursed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Staff can view all expenses
CREATE POLICY "Authenticated users can view expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert expenses
CREATE POLICY "Authenticated users can insert expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update expenses
CREATE POLICY "Authenticated users can update expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can delete expenses
CREATE POLICY "Authenticated users can delete expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Timestamp trigger
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for receipt uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('receipt-uploads', 'receipt-uploads', true);

-- Storage policies for receipt uploads
CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipt-uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipt-uploads');

CREATE POLICY "Authenticated users can delete receipts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'receipt-uploads' AND auth.uid() IS NOT NULL);
