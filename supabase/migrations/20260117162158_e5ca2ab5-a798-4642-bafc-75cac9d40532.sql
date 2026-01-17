-- Add nutrition-specific notes columns to players table
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS nutrition_programming_notes text,
ADD COLUMN IF NOT EXISTS nutrition_next_program_notes text;