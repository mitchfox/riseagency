
-- Add clips column and auto_delete_at for 1-week expiry
ALTER TABLE public.video_analyses 
ADD COLUMN IF NOT EXISTS clips jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auto_delete_at timestamptz NULL;

-- Create function to auto-delete expired videos (keeps rows with annotations/clips)
CREATE OR REPLACE FUNCTION public.cleanup_expired_video_analyses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT id, video_url 
    FROM public.video_analyses 
    WHERE auto_delete_at IS NOT NULL 
      AND auto_delete_at < now()
      AND jsonb_array_length(annotations) = 0
      AND jsonb_array_length(clips) = 0
  LOOP
    IF rec.video_url LIKE '%analysis-videos%' THEN
      DELETE FROM storage.objects 
      WHERE bucket_id = 'analysis-videos' 
        AND name = split_part(rec.video_url, 'analysis-videos/', 2);
    END IF;
    DELETE FROM public.video_analyses WHERE id = rec.id;
  END LOOP;
  
  -- For videos with annotations/clips but expired, just clear the video file
  FOR rec IN
    SELECT id, video_url
    FROM public.video_analyses
    WHERE auto_delete_at IS NOT NULL
      AND auto_delete_at < now()
      AND (jsonb_array_length(annotations) > 0 OR jsonb_array_length(clips) > 0)
  LOOP
    IF rec.video_url LIKE '%analysis-videos%' THEN
      DELETE FROM storage.objects 
      WHERE bucket_id = 'analysis-videos' 
        AND name = split_part(rec.video_url, 'analysis-videos/', 2);
    END IF;
    UPDATE public.video_analyses SET video_url = '', auto_delete_at = NULL WHERE id = rec.id;
  END LOOP;
END;
$$;
