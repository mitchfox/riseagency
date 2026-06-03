## Scope
All changes target the portal Highlights → Playlists flow. Two files:
- `src/components/PlaylistContent.tsx` (playlist list + clip rows)
- `src/components/ClippedActionsPlayer.tsx` (the playlist player dialog)

No backend, no business logic changes — purely UI/UX.

## Changes

### 1. Mobile clip-row layout (PlaylistContent.tsx)
The current row uses a single flex line with #, logo, title, R90 chip and four action buttons (Hash / Play / Download / Trash). On a 390px viewport the Trash button overflows.
- Restructure each clip row as two stacked rows on mobile and a single row on `sm:` and up.
  - Top row: `#index`, club logo, name, R90 chip (wrap allowed).
  - Bottom row (mobile only): right‑aligned action button cluster (Hash / Play / Download / Trash) inside `flex-wrap`.
- Reduce icon button size to `h-8 w-8` and tighten gaps to `gap-1` on mobile.
- Add `min-w-0` and `truncate` to the name container so long names can't push buttons off‑screen.
- Same restructuring applied to the "moving clip" inline editor row so the input + tick + X stay on screen.

### 2. Collapsible "Add clips to playlist"
- Wrap the existing Add‑clips block (label + checklist + Add button) in a `Collapsible` from `@/components/ui/collapsible`, defaulting to **closed**.
- Trigger button shows "Add clips to playlist (N available)" with a chevron, matching the rest of the portal's outline button style.
- State stored in a local `useState` so it persists per render but resets on remount; remembers nothing across sessions (matches existing patterns).

### 3. Auto‑scroll to selected playlist
- Add a `selectedPlaylistRef` (`useRef<HTMLDivElement>`) attached to the "Selected Playlist Content" section.
- In a `useEffect` that depends on `selectedPlaylist?.id`, call `ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })` after a small `requestAnimationFrame` so the layout has expanded.

### 4. "Player" button styling
- In the selected playlist header (line ~590), change the Player button from `variant="outline"` to a custom class: `bg-[hsl(var(--gold))] text-black hover:bg-[hsl(var(--gold))]/90 border-transparent`. Keep the Video icon. This makes it visibly the primary action vs the Sort‑by‑R90 outline button next to it.

### 5. Tapping the currently playing clip restarts it (ClippedActionsPlayer.tsx)
- `jumpToIndex` currently no‑ops when `idx === currentIndex`. Change behaviour so tapping the active clip:
  - Calls `player.seekToRatio(0)` when `hasTimeRange`, OR
  - For standalone clips, finds the `<video>` element (use a `videoRef`) and resets `currentTime = 0; play()`.
- Apply to both the playlist‑mode list and the report‑mode `jumpToClip` (consistent UX).

### 6. Confirm tick / X next to the position input
- In the playlist clip‑list rows, when `movePosById[moveKey]` is set AND the value differs from `idx + 1`, render two adjacent buttons: a green check (`Check` icon, `bg-green-600 text-white`) that commits the reorder via `reorderAndFollow`, and a red X (`bg-red-600 text-white`) that clears the pending value.
- Keep existing Enter‑to‑commit and blur‑to‑commit behaviour so the recent reorder fixes still work — the new buttons just expose the same `reorderAndFollow` path explicitly so the action is obvious on touch devices.

### 7. Player layout: tighter header, wider video, smaller clip list
- Reduce header padding and gaps: `px-4 py-2` → `px-3 py-1.5`, drop the `mt-1` above `action_description`, change `line-clamp-2` to `line-clamp-1` so the description block is one line.
- Reduce Controls‑above‑video block from `py-2` → `py-1` and shrink icon buttons to `h-8 w-8`.
- Resize the clip list at the bottom from `max-h-[35vh]` to `max-h-[22vh]` (≈4 rows visible at the existing row height) on all breakpoints; keep `overflow-y-auto` so scrolling still works.
- Video container already uses `flex-1` so the saved vertical space automatically expands the video. For desktop/tablet width, change the active `video` element from `object-contain` (which letterboxes) to `object-contain w-full h-full` — current state already covers width, but additionally remove side padding by ensuring the parent `<div className="flex-1 …">` has no horizontal padding (it already doesn't) and set the video to `max-w-none`. Net effect: the video fills the dialog width up to its native aspect ratio.

## Technical notes

- All buttons use existing tokens (`hsl(var(--gold))`, `bg-green-600`, `bg-red-600` are pre‑existing Tailwind utilities used elsewhere in this project; gold is the project's primary accent token).
- The reorder confirm tick reuses `reorderAndFollow`, which was added in the recent reorder‑sync fix, so the per‑clip currentIndex tracking continues to work.
- The "restart current clip" behaviour relies on `player.seekToRatio(0)` from `useSharedClipPlayer` for clipped video and a new `videoRef` for the standalone `<video>` element rendered in the dialog.
- No changes to playlist data shape, edge functions, or `usePlaylistActionScores`.
