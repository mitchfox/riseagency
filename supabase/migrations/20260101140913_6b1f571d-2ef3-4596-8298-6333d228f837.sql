-- Add columns for image creator assignment
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS image_due_date DATE;