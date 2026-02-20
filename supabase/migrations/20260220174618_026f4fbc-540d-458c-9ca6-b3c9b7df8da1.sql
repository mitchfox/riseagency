
-- Add clip_annotations column to performance_report_actions
ALTER TABLE public.performance_report_actions
ADD COLUMN IF NOT EXISTS clip_annotations jsonb DEFAULT NULL;

-- Update cleanup function to skip clips/ prefix
CREATE OR REPLACE FUNCTION public.cleanup_expired_video_analyses()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      -- Skip files in the clips/ prefix
      DECLARE
        file_path TEXT := split_part(rec.video_url, 'analysis-videos/', 2);
      BEGIN
        IF file_path NOT LIKE 'clips/%' THEN
          DELETE FROM storage.objects 
          WHERE bucket_id = 'analysis-videos' 
            AND name = file_path;
        END IF;
      END;
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
      DECLARE
        file_path TEXT := split_part(rec.video_url, 'analysis-videos/', 2);
      BEGIN
        IF file_path NOT LIKE 'clips/%' THEN
          DELETE FROM storage.objects 
          WHERE bucket_id = 'analysis-videos' 
            AND name = file_path;
        END IF;
      END;
    END IF;
    UPDATE public.video_analyses SET video_url = '', auto_delete_at = NULL WHERE id = rec.id;
  END LOOP;
END;
$function$;
