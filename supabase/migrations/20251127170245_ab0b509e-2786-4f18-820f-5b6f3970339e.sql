-- Add structured fields to player_outreach_youth table
ALTER TABLE public.player_outreach_youth
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS position text,
ADD COLUMN IF NOT EXISTS current_club text,
ADD COLUMN IF NOT EXISTS nationality text;

-- Add structured fields to player_outreach_pro table
ALTER TABLE public.player_outreach_pro
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS position text,
ADD COLUMN IF NOT EXISTS current_club text,
ADD COLUMN IF NOT EXISTS nationality text;