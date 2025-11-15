-- Allow text values in r90_ratings score field by changing from numeric to text
-- This allows storing values like "xG", "0.25", etc.
ALTER TABLE r90_ratings 
ALTER COLUMN score TYPE text USING score::text;