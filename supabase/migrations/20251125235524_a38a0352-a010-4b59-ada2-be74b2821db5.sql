-- Ensure all clubs have their positions in the database
-- Add x and y position fields to club_network_contacts
ALTER TABLE public.club_network_contacts
ADD COLUMN IF NOT EXISTS x_position numeric,
ADD COLUMN IF NOT EXISTS y_position numeric;