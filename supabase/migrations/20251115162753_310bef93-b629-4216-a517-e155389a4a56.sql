-- Merge "Defensive Actions" category into "Defensive" category
-- Update r90_ratings table
UPDATE r90_ratings 
SET category = 'Defensive'
WHERE category = 'Defensive Actions';

-- Update action_r90_category_mappings table
UPDATE action_r90_category_mappings 
SET r90_category = 'Defensive'
WHERE r90_category = 'Defensive Actions';