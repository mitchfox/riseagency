-- Add hover_image_url field to players table for transparent background images
ALTER TABLE public.players
ADD COLUMN hover_image_url text;