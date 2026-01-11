-- Add image_url column to marketing_tips table
ALTER TABLE public.marketing_tips 
ADD COLUMN IF NOT EXISTS image_url TEXT;