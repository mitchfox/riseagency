-- Remove the r90_sub_subcategory column and add a column to store selected rating IDs
ALTER TABLE action_r90_category_mappings 
DROP COLUMN IF EXISTS r90_sub_subcategory;

-- Add a column to store an array of specific R90 rating IDs to display
ALTER TABLE action_r90_category_mappings 
ADD COLUMN selected_rating_ids uuid[] DEFAULT NULL;