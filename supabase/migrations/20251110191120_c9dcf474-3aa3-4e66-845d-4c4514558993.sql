-- Add subcategory column to action_r90_category_mappings
ALTER TABLE action_r90_category_mappings
ADD COLUMN r90_subcategory text;