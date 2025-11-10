-- Add sub_subcategory column to action_r90_category_mappings table
ALTER TABLE public.action_r90_category_mappings 
ADD COLUMN r90_sub_subcategory text;