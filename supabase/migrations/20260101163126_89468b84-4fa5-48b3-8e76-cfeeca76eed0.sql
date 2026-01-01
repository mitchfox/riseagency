-- Add signer_party column to distinguish between "me" (owner) and "counterparty" (other party)
ALTER TABLE public.signature_fields 
ADD COLUMN IF NOT EXISTS signer_party TEXT NOT NULL DEFAULT 'counterparty';

-- Add a comment for clarity
COMMENT ON COLUMN public.signature_fields.signer_party IS 'Who should sign this field: owner (me) or counterparty (other party)';

-- Add owner_signed_at to track when owner has signed their fields
ALTER TABLE public.signature_contracts
ADD COLUMN IF NOT EXISTS owner_signed_at TIMESTAMP WITH TIME ZONE;

-- Add owner_field_values to store owner's filled values
ALTER TABLE public.signature_contracts
ADD COLUMN IF NOT EXISTS owner_field_values JSONB DEFAULT '{}';

-- Add completed_pdf_url to store the final signed PDF
ALTER TABLE public.signature_contracts
ADD COLUMN IF NOT EXISTS completed_pdf_url TEXT;