
Root cause

The edit screens are still showing the full match because they are not actually using the same playback system as the report view.

Right now:
- `PerformanceReport.tsx` opens clips through `ActionVideoPopup` + `useSharedClipPlayer`
- that player loads the source once, seeks to `clip_start`, enforces `clip_end` and blocks playback outside the window

But the edit screens still use plain `<video>` elements:
- `ActionTypeEditor.tsx`
- `ScoreEditMode.tsx`
- `MatchClipPlayer.tsx`

Those screens were changed to use `getEditPlaybackUrl(...)`, but that helper returns a `#t=start,end` media fragment for full-match URLs. That still points at the full match file, so the browser can still expose the full video. It is not the same as the report view.

What I would change

1. Stop using media-fragment playback for edit mode
- Retire `getEditPlaybackUrl(...)` from edit surfaces for any action with `clip_start` / `clip_end`
- Keep it only as a fallback helper if needed for genuine standalone trimmed clip files

2. Create one shared edit playback layer that mirrors report-view behaviour
- Add a small reusable edit-mode clip player wrapper around `useSharedClipPlayer`
- Input: `video_url`, `clip_start`, `clip_end`
- Behaviour:
  - standalone trimmed clip URL -> play directly
  - full match + clip bounds -> play via shared clip player with strict boundary enforcement
  - full match without bounds -> blocked state

3. Rewire `ActionTypeEditor.tsx`
- Replace direct `vid.src = resolvedUrl` loading with shared-player clip playback
- Preserve the existing editor layout, zoom and controls
- On action change, call the shared player with `{ videoUrl, clipStart, clipEnd }`
- Keep hidden preloading, but preload the real source that the shared player will use

4. Rewire `ScoreEditMode.tsx`
- Replace each tile’s direct `src={getEditPlaybackUrl(action)}` with the same strict clip playback approach
- Each of the four visible tiles should only ever play the clip window or standalone clip file
- Keep page advance and background save behaviour unchanged

5. Rewire `MatchClipPlayer.tsx`
- Remove direct `<video src=...>` playback
- Use the same shared clip logic as the report viewer so looping and next/previous operate on the clip only

6. Keep the current report viewer as the reference implementation
- Use `ActionVideoPopup.tsx`, `ClippedActionsPlayer.tsx` and `RankedActionsPlayer.tsx` as the behavioural source of truth
- Do not create a third playback behaviour for staff edit mode

7. Tighten the clip utility API
- Keep `hasPlayableClip(...)` and `getPlaybackMode(...)`
- Add a helper that returns structured playback instructions instead of a URL, for example:
```text
standalone -> { mode: "standalone", src }
clipped -> { mode: "clipped", videoUrl, clipStart, clipEnd }
blocked -> { mode: "blocked" }
```
- This avoids future regressions where another screen falls back to raw `video_url`

Files to update

- `src/lib/clipVideoUtils.ts`
- `src/components/staff/ActionTypeEditor.tsx`
- `src/components/staff/analysis/ScoreEditMode.tsx`
- `src/components/staff/analysis/MatchClipPlayer.tsx`
- possibly a new small shared component/hook for staff edit playback if needed

Technical details

- The current issue is not that the clip data is missing. `clip_start` and `clip_end` are already being fetched in the edit screens.
- The issue is that browser `#t=` fragments are not strict clip playback.
- If you want edit mode to work exactly like report view, it must use `useSharedClipPlayer` or the same underlying enforcement logic.
- This will make staff edit mode match what you see when viewing the report, even when the stored `video_url` is still the source match file.

Validation I would do after implementation

- Open a report in normal view and note one action clip
- Open the same action in:
  - Action Edit
  - Score Edit
  - Match Clip Player
- Confirm each starts inside the same clip window and cannot drift into the full match
- Confirm next/previous and auto-advance still feel instant
- Confirm standalone trimmed clips still play normally
- Confirm full-match URLs with no bounds are blocked instead of exposing the match
