Add R90 (action_score) display to all playlist clips across the player portal and staff highlights portal, with a button to permanently reorder any playlist by R90 score (highest first).

### 1. R90 Lookup Hook
Create `usePlaylistActionScores(playerId, clips)` that queries `performance_report_actions` for the player, matches `video_url` against clip `videoUrl`s, and returns a lookup map `videoUrl -> action_score`.

### 2. Player Portal — `PlaylistContent.tsx`
- Use the hook to fetch action scores for the current player's clips.
- Build a `videoUrl -> action_score` map.
- Extend the local `Clip` interface to include `action_score?: number | null`.
- Render an R90 colour-coded badge next to each clip name using `getR90Grade` (same oval style used in performance reports).
- Add a **"Sort by R90"** button in the selected-playlist header. When clicked, sort clips by `action_score` descending (treating missing as 0), update local state, and persist via `update-playlist` edge function.
- Pass `action_score` through to `ClippedActionsPlayer` so the player list also shows the badge.

### 3. Staff Portal — `HighlightsPortal.tsx`
- Cross-reference existing `actions` array (already loaded) with playlist clips to derive `action_score` for each clip.
- Pass `action_score` into `SortableClipRow` and display the R90 badge.
- Add a **"Sort by R90"** button per playlist card header that reorders clips by score descending and persists via `playlist-manage` (action: "reorder").

### 4. `AddToPlaylistButton` & `ClippedActionsPlayer`
- Update `AddToPlaylistButton` props to accept optional `action_score` and pass it through to the edge function.
- Update `ClippedActionsPlayer` playlist clip construction in `PlaylistContent.tsx` and `HighlightsPortal.tsx` to include `action_score`.

### 5. Edge Function — `playlist-manage`
- In `addClip` and `reorder` actions, preserve `action_score` if present on incoming clip objects.

### Notes
- Missing scores default to 0 for sorting purposes.
- The R90 badge uses the existing `getR90Grade` colour system for visual consistency with performance reports.
- No database schema changes required; scores are looked up dynamically and passed through JSONB.