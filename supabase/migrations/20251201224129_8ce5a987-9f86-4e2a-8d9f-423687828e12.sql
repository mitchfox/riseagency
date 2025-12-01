-- Update the check constraint on the players table to allow new category values
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_category_check;

ALTER TABLE players ADD CONSTRAINT players_category_check 
CHECK (category IN ('Signed', 'Mandate', 'Fuel For Football', 'Previously Mandated', 'Scouted', 'Other'));