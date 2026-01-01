-- Add completed_by column to track who moved the post to ready_to_post
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES public.profiles(id);

-- Add comment for documentation
COMMENT ON COLUMN public.blog_posts.completed_by IS 'User who moved the post from ready_for_image to ready_to_post';