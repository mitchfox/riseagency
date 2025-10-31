-- Add club and club_logo columns to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS club TEXT,
ADD COLUMN IF NOT EXISTS club_logo TEXT;