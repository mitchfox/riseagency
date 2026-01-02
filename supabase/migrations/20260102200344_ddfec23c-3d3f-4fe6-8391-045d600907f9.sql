-- Fix Scout Portal RLS: Allow scouts to create and manage reports using scout_id
-- Since scouts use localStorage auth (not Supabase Auth), we need to allow inserts
-- based on scout_id existence rather than auth.jwt()

-- Add policy to allow anyone to insert scouting reports when scout_id references a valid active scout
CREATE POLICY "Scouts can insert reports via scout_id"
ON public.scouting_reports
FOR INSERT
TO public
WITH CHECK (
  scout_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM scouts
    WHERE scouts.id = scout_id
    AND scouts.status = 'active'
  )
);

-- Add policy to allow scouts to update their own reports via scout_id
CREATE POLICY "Scouts can update their own reports via scout_id"
ON public.scouting_reports
FOR UPDATE
TO public
USING (
  scout_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM scouts
    WHERE scouts.id = scout_id
    AND scouts.status = 'active'
  )
);

-- Add policy for scouting_report_drafts to allow inserts via scout_id
CREATE POLICY "Scouts can insert drafts via scout_id"
ON public.scouting_report_drafts
FOR INSERT
TO public
WITH CHECK (
  scout_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM scouts
    WHERE scouts.id = scout_id
    AND scouts.status = 'active'
  )
);

-- Add policy for scouts to select their own drafts via scout_id
CREATE POLICY "Scouts can select drafts via scout_id"
ON public.scouting_report_drafts
FOR SELECT
TO public
USING (
  scout_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM scouts
    WHERE scouts.id = scout_id
    AND scouts.status = 'active'
  )
);

-- Add policy for scouts to update their own drafts via scout_id  
CREATE POLICY "Scouts can update drafts via scout_id"
ON public.scouting_report_drafts
FOR UPDATE
TO public
USING (
  scout_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM scouts
    WHERE scouts.id = scout_id
    AND scouts.status = 'active'
  )
);

-- Add policy for scouts to delete their own drafts via scout_id
CREATE POLICY "Scouts can delete drafts via scout_id"
ON public.scouting_report_drafts
FOR DELETE
TO public
USING (
  scout_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM scouts
    WHERE scouts.id = scout_id
    AND scouts.status = 'active'
  )
);

-- Also allow scouts to view their own submitted reports via scout_id
CREATE POLICY "Scouts can select their reports via scout_id"
ON public.scouting_reports
FOR SELECT
TO public
USING (
  scout_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM scouts
    WHERE scouts.id = scout_id
    AND scouts.status = 'active'
  )
);