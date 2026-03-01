

# Purge source video, keep clips

## What changes

A single "Purge Source" button on the video analysis detail view (when a video is selected). Clicking it:

1. **Deletes the source video file** from `analysis-videos` storage (the large 4GB file)
2. **Clears `video_url`** on the record and sets `auto_delete_at = NULL` (no timer needed when there's nothing to expire)
3. **Preserves everything else** — the video analysis record, all clip metadata, all extracted clip files in `analysis-videos/clips/`, all annotations, all report links

The video player area then shows a "Source video purged — clips still available" message instead of a broken player. Clips remain fully playable since they're separate files.

## UI placement

- Inside the selected video detail view, near the top toolbar alongside the existing Sync/Export buttons
- Icon: `HardDriveDownload` or `Trash2` with label "Purge Source"
- Confirmation dialog before purging (destructive action, can't undo)
- On the video card grid, videos with purged sources show a visual indicator (e.g. strikethrough on the expiry timer or a "Source removed" badge)

## Implementation

### `VideoAnalysis.tsx`
- Add a `handlePurgeSource` function that:
  - Extracts the storage path from `video_url` (skipping anything in `clips/`)
  - Calls `supabase.storage.from('analysis-videos').remove([path])`
  - Updates the DB record: `video_url = '', auto_delete_at = null`
  - Updates local state
- Add an `AlertDialog` for confirmation
- Conditionally render the video player vs a "Source purged" message based on whether `video_url` is empty
- Add "Source removed" badge on cards where `video_url` is empty but clips exist

No database migration needed — `video_url` and `auto_delete_at` already support empty/null values. No new edge functions needed.

