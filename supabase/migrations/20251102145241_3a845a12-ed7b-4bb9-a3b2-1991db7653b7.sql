-- Add author column to coaching_aphorisms table
ALTER TABLE coaching_aphorisms 
ADD COLUMN author text;

-- Make body_text nullable
ALTER TABLE coaching_aphorisms 
ALTER COLUMN body_text DROP NOT NULL;