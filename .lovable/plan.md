## Goals

1. After reordering a clip inside the playlist player, the list numbering and active highlight must update instantly — no need to close and reopen.
2. Each clip in playlists (list rows + in‑player rows) shows the club logo of the match (from the performance report it came from) so the source game is recognisable at a glance.
3. Sorting a playlist by R90 score now requires a clear Yes/No confirmation so it can’t be triggered by accident.

## 1. Smooth in‑player reorder

Root cause: in `src/components/PlaylistContent.tsx` the clips handed to `ClippedActionsPlayer` use index‑based ids (`${selectedPlaylist.id}-${i}`). When `moveClip` rewrites the array, every clip’s `id` shifts with its new index, so the player’s internal `currentIndex` stays put while the underlying clip identity changes. The active row, "▶" marker, and `1/N` counter all end up pointing at the wrong clip until the dialog is re‑mounted.

Fixes:
- Generate stable clip ids in `PlaylistContent.tsx` from the videoUrl (e.g. `c.id || hash(videoUrl)`), so the same clip keeps the same id across reorders.
- In `src/components/ClippedActionsPlayer.tsx`, when `onReorderClip` is called, optimistically move `currentIndex` to the new target position if the moved clip was the currently playing one, and otherwise re‑resolve `currentIndex` from the currently playing clip’s stable id whenever the `clips` prop changes (track previous `currentClip.id` in a ref and re‑find it in `sortedClips`).
- Clear `movePosById` for the moved clip immediately on submit so the typed number doesn’t linger as stale text.

Result: numbers in the left column, the highlighted row, and the `N/Total` counter all reflect the new order the moment the user confirms a move.

## 2. Match club logo on clips and in player

Extend the existing lookup hook so callers get a `videoUrl → { score, clubLogoUrl, opponent }` map.

- Rework `src/hooks/usePlaylistActionScores.ts` (or add a sibling `usePlaylistClipMeta.ts`) to also `select id, club_logo_url, opponent` on `player_analysis`, then join via `analysis_id` on `performance_report_actions`. Return `Record<videoUrl, { score: number|null; clubLogoUrl: string|null; opponent: string|null }>`.
- In `PlaylistContent.tsx`, render a small 16–20px club crest next to each clip row in the playlist edit list, and pass `club_logo_url` + `opponent` through the clip objects sent to `ClippedActionsPlayer` (add optional fields to the clip interface).
- In `ClippedActionsPlayer.tsx`, in playlist mode show the same small crest at the left of each row (before the number) and a slightly larger crest in the now‑playing header area beside the clip title.
- Fallback: when no logo is found, leave the slot empty (no placeholder square) so the row stays clean.

## 3. Confirm before R90 sort

In `PlaylistContent.tsx`:
- Replace the direct `onClick={sortPlaylistByR90}` with an `AlertDialog` (shadcn) trigger.
- Dialog copy: title "Reorder by R90 score?", body "This rewrites the order of every clip in this playlist. You can’t undo it in one click."
- Buttons: Cancel (red, `bg-destructive text-destructive-foreground`) on the left, Confirm (green, custom `bg-green-600 hover:bg-green-700 text-white`) on the right — large, full‑width on mobile so they’re hard to miss.
- Only call `sortPlaylistByR90` on Confirm; close dialog either way.

## Files touched

- `src/components/PlaylistContent.tsx` — stable clip ids, club logo column, R90 confirm dialog, pass logo/opponent through to player.
- `src/components/ClippedActionsPlayer.tsx` — re‑resolve `currentIndex` from stable clip id when `clips` change, show club crest in playlist row + header, clear stale move input.
- `src/hooks/usePlaylistActionScores.ts` — return per‑clip metadata (score + club logo + opponent), keeping current `scoreFor` callers working via a thin adapter.

## Out of scope

- Server‑side playlist schema changes (logo lookup stays a client join against existing tables).
- Drag‑and‑drop reordering — only the "type new position" flow is being polished.
- Staff `HighlightReelPlayer` is untouched; this change is scoped to the portal playlist experience the user described.
