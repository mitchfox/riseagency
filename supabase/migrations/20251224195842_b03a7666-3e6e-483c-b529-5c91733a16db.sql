-- Add notification preference columns for post ideas
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS post_ideas boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS post_idea_status boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS post_idea_canva boolean NOT NULL DEFAULT true;