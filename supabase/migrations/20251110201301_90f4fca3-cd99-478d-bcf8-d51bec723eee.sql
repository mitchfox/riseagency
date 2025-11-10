-- Drop the existing unique constraint that only allows one mapping per action type
ALTER TABLE action_r90_category_mappings 
DROP CONSTRAINT IF EXISTS action_r90_category_mappings_action_type_key;

-- Add a new unique constraint that allows multiple mappings per action type
-- but prevents duplicate combinations of action_type + category + subcategory
ALTER TABLE action_r90_category_mappings
ADD CONSTRAINT action_r90_category_mappings_unique_combination 
UNIQUE (action_type, r90_category, r90_subcategory);