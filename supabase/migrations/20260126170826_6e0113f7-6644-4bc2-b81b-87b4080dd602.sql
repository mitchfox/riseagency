-- Add folder_id column to custom_marketing_resources for folder organization
ALTER TABLE public.custom_marketing_resources 
ADD COLUMN IF NOT EXISTS folder_id TEXT;

-- Update resource_type to include 'folder' option
-- (Already a text column so no constraint changes needed)