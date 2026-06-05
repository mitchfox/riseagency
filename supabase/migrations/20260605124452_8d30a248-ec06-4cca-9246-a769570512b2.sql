ALTER TABLE public.signature_submissions ADD COLUMN IF NOT EXISTS submission_type text NOT NULL DEFAULT 'electronic';
ALTER TABLE public.signature_submissions DROP CONSTRAINT IF EXISTS signature_submissions_type_check;
ALTER TABLE public.signature_submissions ADD CONSTRAINT signature_submissions_type_check CHECK (submission_type IN ('electronic','manual_upload'));