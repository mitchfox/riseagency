
CREATE TABLE public.annotation_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_name TEXT NOT NULL,
  klips JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.annotation_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own annotation projects"
  ON public.annotation_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own annotation projects"
  ON public.annotation_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annotation projects"
  ON public.annotation_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotation projects"
  ON public.annotation_projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_annotation_projects_updated_at
  BEFORE UPDATE ON public.annotation_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
