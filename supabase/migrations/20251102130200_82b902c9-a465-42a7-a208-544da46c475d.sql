-- Update coaching_sessions table to store exercises array instead of simple content
-- Add exercises column to store array of exercise objects
ALTER TABLE coaching_sessions 
ADD COLUMN IF NOT EXISTS exercises JSONB DEFAULT '[]'::jsonb;

-- Drop the old content column as it's replaced by structured exercises
ALTER TABLE coaching_sessions 
DROP COLUMN IF EXISTS content;

-- Update description to make it optional
ALTER TABLE coaching_sessions 
ALTER COLUMN description DROP NOT NULL;