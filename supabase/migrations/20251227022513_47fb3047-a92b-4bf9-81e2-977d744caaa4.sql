-- Add new columns to scouting_report_drafts table
ALTER TABLE public.scouting_report_drafts
ADD COLUMN IF NOT EXISTS year_of_birth integer,
ADD COLUMN IF NOT EXISTS birth_month integer,
ADD COLUMN IF NOT EXISTS birth_day integer,
ADD COLUMN IF NOT EXISTS video_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS report_type text,
ADD COLUMN IF NOT EXISTS independent_report_url text,
ADD COLUMN IF NOT EXISTS player_contact_email text,
ADD COLUMN IF NOT EXISTS player_contact_phone text,
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS contact_relationship text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS existing_agent text,
ADD COLUMN IF NOT EXISTS agent_contract_end text,
ADD COLUMN IF NOT EXISTS additional_notes text;