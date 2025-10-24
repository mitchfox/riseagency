-- Add additional columns to player_analysis table
ALTER TABLE public.player_analysis 
ADD COLUMN opponent TEXT,
ADD COLUMN result TEXT,
ADD COLUMN minutes_played INTEGER;

-- Create storage bucket for analysis files
INSERT INTO storage.buckets (id, name, public)
VALUES ('analysis-files', 'analysis-files', false);

-- Create RLS policies for analysis files bucket
CREATE POLICY "Staff can upload analysis files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'analysis-files' AND
  (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Staff can update analysis files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'analysis-files' AND
  (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Staff can delete analysis files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'analysis-files' AND
  (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Players can view their analysis files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'analysis-files' AND
  (
    has_role(auth.uid(), 'staff'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    -- Allow players to view files linked to their analysis
    name LIKE '%' || (
      SELECT id::text FROM public.players WHERE email = auth.jwt() ->> 'email'
    ) || '%'
  )
);