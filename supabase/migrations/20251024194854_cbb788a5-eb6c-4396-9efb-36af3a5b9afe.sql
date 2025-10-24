-- Add video_url column to coaching_exercises table
ALTER TABLE coaching_exercises ADD COLUMN IF NOT EXISTS video_url text;