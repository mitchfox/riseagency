-- Drop old check constraint and add new one with all valid values
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_representation_status_check;

ALTER TABLE players ADD CONSTRAINT players_representation_status_check 
  CHECK (representation_status IN ('represented', 'mandated', 'previously_mandated', 'scouted', 'other'));

-- Update representation_status to match category values
UPDATE players SET representation_status = 'previously_mandated' WHERE category = 'Previously Mandated';
UPDATE players SET representation_status = 'scouted' WHERE category = 'Scouted';