

## Root cause identified

The 413 error is **not** caused by the TUS configuration, endpoint, or chunk size. All of those are now correct.

The error occurs because Supabase Storage checks the **total file size** (sent in the `Upload-Length` header during the TUS creation request) against the project's **global file size limit** before any data is transferred. Even with chunked uploads, a 4.5GB file is rejected instantly if the global limit is lower.

The bucket-level limit we set to 50GB is irrelevant here because the **global limit takes precedence** and caps all buckets. On Lovable Cloud, this global limit is likely set to a default value well below 4.5GB.

Your largest successfully uploaded file is ~1GB, which confirms the global limit is somewhere around 1-2GB.

### What needs to happen

The global storage file size limit needs to be increased to at least 5GB (or higher) through the backend settings:

1. Open Lovable Cloud backend settings
2. Navigate to Storage → Settings
3. Increase the "Global file size limit" to 5GB or higher

This is a project configuration setting, not a code change. No further code modifications are needed — the TUS implementation, endpoint, and chunk configuration are all correct.

### After the global limit is raised

The existing code will work as-is. The TUS client will:
- Send the creation request with the full file size
- Storage will accept it (since it's under the new global limit)
- Chunks will upload at 6MB each with automatic retry
- Progress tracking will work throughout

### Optional code improvement

Add a more helpful error message when a 413 is returned, telling the user the file exceeds the platform's configured limit rather than showing the raw TUS error.

