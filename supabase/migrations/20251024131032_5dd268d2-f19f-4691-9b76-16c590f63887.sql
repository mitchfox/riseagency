-- Add category column to players table
ALTER TABLE players 
ADD COLUMN category TEXT DEFAULT 'Other' CHECK (category IN ('Signed', 'Mandate', 'Other'));