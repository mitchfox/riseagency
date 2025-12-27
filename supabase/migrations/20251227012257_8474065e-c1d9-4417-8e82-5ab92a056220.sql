-- Add workflow columns to blog_posts for content pipeline
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS image_url_internal text,
ADD COLUMN IF NOT EXISTS canva_link text,
ADD COLUMN IF NOT EXISTS scheduled_date date,
ADD COLUMN IF NOT EXISTS posted_at timestamp with time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.blog_posts.workflow_status IS 'draft, ready_for_image, posted';
COMMENT ON COLUMN public.blog_posts.image_url_internal IS 'Uploaded image for the post';
COMMENT ON COLUMN public.blog_posts.canva_link IS 'Canva design link';
COMMENT ON COLUMN public.blog_posts.scheduled_date IS 'When the post should be published';
COMMENT ON COLUMN public.blog_posts.posted_at IS 'When the post was actually posted';