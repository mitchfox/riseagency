UPDATE storage.buckets SET file_size_limit = 53687091200 WHERE id = 'analysis-videos';

-- Update the global file size limit for the project
UPDATE storage.buckets SET file_size_limit = 53687091200 WHERE file_size_limit IS NOT NULL;

-- For buckets without an explicit limit, set a generous default
UPDATE storage.buckets SET file_size_limit = 53687091200 WHERE file_size_limit IS NULL;