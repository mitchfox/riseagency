
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS seo_image_url TEXT;

-- Backfill slug from title
UPDATE public.jobs
SET slug = regexp_replace(lower(trim(title)), '[^a-z0-9]+', '-', 'g')
WHERE slug IS NULL OR slug = '';

-- Strip leading/trailing dashes
UPDATE public.jobs
SET slug = regexp_replace(slug, '(^-+|-+$)', '', 'g')
WHERE slug ~ '(^-|-$)';

ALTER TABLE public.jobs
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_slug_unique ON public.jobs (slug);

-- Storage bucket for CV uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-applications', 'job-applications', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload (public apply form)
DROP POLICY IF EXISTS "Anyone can upload job applications" ON storage.objects;
CREATE POLICY "Anyone can upload job applications"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'job-applications');

-- Anyone can read (public bucket)
DROP POLICY IF EXISTS "Public can read job applications" ON storage.objects;
CREATE POLICY "Public can read job applications"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-applications');

-- Only staff/admin can delete
DROP POLICY IF EXISTS "Staff can delete job applications" ON storage.objects;
CREATE POLICY "Staff can delete job applications"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'job-applications'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  )
);
