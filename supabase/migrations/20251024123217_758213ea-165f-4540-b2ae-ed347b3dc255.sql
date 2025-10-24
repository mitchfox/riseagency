
-- Change reps column from integer to text to support various formats
ALTER TABLE coaching_exercises 
ALTER COLUMN reps TYPE text USING reps::text;
