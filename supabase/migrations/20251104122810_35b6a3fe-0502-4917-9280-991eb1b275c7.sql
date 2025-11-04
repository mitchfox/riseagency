-- Drop the existing check constraint on players category
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_category_check;

-- Add the new check constraint with all existing categories plus "Fuel For Football"
ALTER TABLE players ADD CONSTRAINT players_category_check 
CHECK (category IN ('Other', 'Mandate', 'Signed', 'Fuel For Football'));