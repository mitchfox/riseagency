ALTER TABLE public.outreach_relationships
ADD COLUMN IF NOT EXISTS manually_added boolean NOT NULL DEFAULT false;