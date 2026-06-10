# Fix Transfer Hub data + rebuild search with dropdown

## 1. Transfer Hub showing blank lists

### Problem
Since the club outreach system was migrated to a many-to-many model (`club_outreach_links` + `club_outreach_link_players`), the legacy `club_outreach.player_id` column is no longer populated for new outreach. The player portal's Transfer Hub still queries the old shape, so historical and recent outreach both come back empty.

- `src/components/PlayerClubInterest.tsx` reads `club_outreach` by `player_id` and `club_outreach_updates` by `outreach_id` (old IDs).
- `PlayerOutreachUpdates.tsx` already uses the link table, but does not surface the older legacy outreach rows the player previously had.

### Fix
Rewrite `PlayerClubInterest.tsx` (the "Club Interest" tab) so it loads in two passes and merges:

1. Legacy: `club_outreach` rows where `player_id = playerId` (kept for backward compatibility with already-saved data).
2. New: `club_outreach_link_players` → `link_id` set → `club_outreach_links` rows (club_name, status fields, latest update). Map each link row into the same `ClubOutreach` shape used by the UI.
3. De-dupe by club_name + created_at, sort newest first, render unchanged.

When the row is expanded, fetch `club_outreach_communications` for the new-style link IDs (since `club_outreach_updates` is the legacy table) and still fetch `club_outreach_updates` for legacy IDs. Display whichever exists.

Apply the same merge to:
- `PlayerOutreachUpdates.tsx` — also pull legacy `club_outreach_updates` joined by legacy `club_outreach.player_id` so the player still sees historical updates.
- `PlayerTransferStatus.tsx` — verify it reads from the right source; if it depends on `club_outreach.status`, include the new-style link statuses too.

Result: the player sees every club ever contacted on their behalf, old and new combined, with their latest update.

## 2. Outreach + Player Database search

### What the user wants
- Typing in the search box shows a small dropdown of matching player names (and clubs) underneath.
- Pressing Enter (or clicking a suggestion) filters the table/board to only rows whose name/club/position contains those letters.
- Today: `StaffSearchInput` debounces text into the filter, no dropdown, and on some screens the filtered result feels like "nothing happens".

### Fix
Create a new `SearchWithSuggestions` component (in `src/components/staff/`) that wraps an `Input` with a popover dropdown:

- Props: `value`, `onChange`, `onCommit(value)`, `suggestions: { id, label, sublabel? }[]`, `placeholder`.
- As the user types, `value` updates locally and the parent receives `onChange` immediately (so the dropdown shows live matches). The parent does NOT filter the heavy table on every keystroke — instead it filters only when `onCommit` fires.
- `onCommit` fires on Enter, on suggestion click, and on blur if the value changed.
- Dropdown shows up to 8 suggestions matching the current text (case-insensitive `includes`), grouped: players first, then clubs (deduped). Highlights matched substring.
- ArrowUp/ArrowDown/Enter keyboard navigation; Esc closes.

Wire it in:

- **`PlayerDatabase.tsx`** — replace the `StaffSearchInput` block. Suggestions are built from `players` (name + club). Committed value drives the existing `deferredSearchQuery` filter so the table updates after Enter/selection.
- **`PlayerOutreachPanel.tsx`** (Youth + Pro table view) — same swap. Suggestions from current `data` rows (player_name, current_club).
- **`OutreachPipelineBoard.tsx`** — same swap so the pipeline board also gets the dropdown and "Enter to filter" behaviour.

### Technical details
- Suggestions list is memoised on the source array + current typed value; capped at 8 entries to stay fast.
- The committed value is what feeds the existing filter pipelines, so no other logic needs to change.
- The component stays controlled, so clearing (X button) commits empty string and resets the table.
- Keep `StaffSearchInput` available for other places (header search etc.) — only replace the three call sites above.

## Files touched

- `src/components/PlayerClubInterest.tsx` — merge legacy + new-style outreach.
- `src/components/player/PlayerOutreachUpdates.tsx` — also include legacy updates.
- `src/components/player/PlayerTransferStatus.tsx` — include link-table statuses if needed.
- `src/components/staff/SearchWithSuggestions.tsx` — new.
- `src/components/staff/PlayerDatabase.tsx` — swap search input.
- `src/components/staff/PlayerOutreachPanel.tsx` — swap search input.
- `src/components/staff/recruitment/OutreachPipelineBoard.tsx` — swap search input.

No database migrations required.
