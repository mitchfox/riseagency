-- Add category column to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN category text;

-- Add index for better query performance
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category);

-- Add index for published and category combination
CREATE INDEX idx_blog_posts_published_category ON public.blog_posts(published, category);