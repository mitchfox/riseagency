-- Add password column to signature_contracts table for individual contract protection
ALTER TABLE public.signature_contracts 
ADD COLUMN IF NOT EXISTS view_password TEXT DEFAULT NULL;

-- Add a comment to clarify usage
COMMENT ON COLUMN public.signature_contracts.view_password IS 'Optional password required to view/sign the contract';

-- Create a settings table for section-level passwords if it doesn't exist
CREATE TABLE IF NOT EXISTS public.staff_section_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_section_passwords ENABLE ROW LEVEL SECURITY;

-- Only authenticated staff can read/manage section passwords
CREATE POLICY "Authenticated users can read section passwords"
ON public.staff_section_passwords
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert section passwords"
ON public.staff_section_passwords
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update section passwords"
ON public.staff_section_passwords
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete section passwords"
ON public.staff_section_passwords
FOR DELETE
TO authenticated
USING (true);