-- Add league field to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS league text;