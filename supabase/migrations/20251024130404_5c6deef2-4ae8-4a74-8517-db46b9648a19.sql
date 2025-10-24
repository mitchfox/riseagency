-- Make the analysis-files bucket public so highlights are viewable
UPDATE storage.buckets
SET public = true
WHERE id = 'analysis-files';