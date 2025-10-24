-- Add is_own_video column to coaching_exercises table
ALTER TABLE coaching_exercises ADD COLUMN IF NOT EXISTS is_own_video boolean DEFAULT false;