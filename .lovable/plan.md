
What has actually been implemented vs what is still wrong

1. Schedule
- Partly implemented:
  - there is now a separate `marketingschedule` section in the Staff sidebar and it appears above Marketing in `src/pages/Staff.tsx`
- Not implemented correctly:
  - `ScheduleManager.tsx` is still built around `scheduled_posts`, `blog_posts`, draft posts, Canva links, and template folders
  - it is still effectively scheduling actual posts/content items, not reusable post types / templates
  - it still has calendar-style logic and does not use the Prospect Board card/column interaction model
  - it is still also embedded inside `PostContent.tsx`, which is why it feels like it lives inside Marketing rather than as its own distinct tool

2. Clip players
- Partly implemented:
  - report view and dialog now fetch and pass `clip_start` / `clip_end`
  - `PerformanceReport.tsx` and `PerformanceReportDialog.tsx` do create a shared player instance and pass it down
- Not implemented correctly:
  - playback is still based on loading the full match URL and seeking within it
  - that architecture cannot guarantee “only the clip and nothing else”
  - `ActionVideoPopup`, `ClippedActionsPlayer`, and `RankedActionsPlayer` still contain local fallback hook instances
  - staff edit popup still uses `ActionVideoPopup` without a lifted shared player
  - current fail-closed logic only blocks some bad states; it does not remove the core problem that the source itself is still the full match

What I would change now

1. Replace the Schedule tool, not patch it
- Stop using the current `ScheduleManager` as the weekly content planner
- Rebuild it as a true board with Monday–Sunday columns and draggable cards styled from `ProspectBoard.tsx`
- Cards should represent post types / content templates only, such as:
  - Highlight Reel
  - Matchday Graphic
  - Story Update
  - Training Clip
  - Player Spotlight
  - Testimonial
  - Behind the Scenes
- Each card should hold:
  - post type
  - platform format (story/post/reel/etc.)
  - planned day/time
  - owner
  - status (planned / creating / ready / posted)
  - optional linked content-creator draft
- Keep this as its own section above Marketing in the sidebar, and remove the embedded schedule block from `PostContent.tsx`

2. Split “post type planning” from “created content linking”
- Introduce a schedule item model that is independent from `blog_posts`
- Then optionally attach a draft/unposted content item from Content Creator to a schedule card
- This matches your request: plan content style first, then tag created assets onto it later

3. Reuse the actual Prospect Board interaction style
- Copy the board language from `ProspectBoard.tsx`:
  - column layout
  - strong card styling
  - drag/drop movement
  - compact visual status markers
- Adapt it for weekly scheduling instead of player stages

4. Stop trying to enforce clip-only playback with a full-match source
- Do not keep patching `useSharedClipPlayer` against the full match URL
- If the requirement is “never show the full match under any circumstance”, the player source itself must be the clip, not the match
- New rule:
  - report players only open if a real clip asset exists
  - if no clip asset exists, show toast/error and do not open anything
- No more full-video seek fallback at all

5. Change export/playback architecture for reports
- For report playback, use true clip media:
  - existing pre-trimmed clip file if available, or
  - generate/store a clip asset once and reuse it
- Store a dedicated clip playback URL per exported action
- Keep `clip_start` / `clip_end` as metadata, but do not rely on them as the playback mechanism
- This is the only way to satisfy:
  - no full-match exposure
  - exact clip only
  - identical behavior in edit and view

6. Harden every report viewer to fail closed
- `ActionVideoPopup`, `ClippedActionsPlayer`, `RankedActionsPlayer`
- If an action has no clip asset URL:
  - show error toast
  - do not mount video
  - do not attempt full-match playback
- Remove local fallback `useSharedClipPlayer()` creation from child players so there is only one control path where needed

7. Clean up what was partially done
- Remove the schedule widget from `src/components/staff/marketing/PostContent.tsx`
- Refactor `src/components/staff/marketing/ScheduleManager.tsx` into a real weekly board
- Keep the sidebar placement in `src/pages/Staff.tsx`, but make the section feel separate in both navigation and content
- Replace the current report clip playback contract across:
  - `src/hooks/useSharedClipPlayer.ts`
  - `src/components/ActionVideoPopup.tsx`
  - `src/components/ClippedActionsPlayer.tsx`
  - `src/components/report/RankedActionsPlayer.tsx`
  - `src/pages/PerformanceReport.tsx`
  - `src/components/PerformanceReportDialog.tsx`
  - `src/components/staff/PerformanceActionsDialog.tsx`

Expected outcome
- Schedule becomes its own proper weekly board above Marketing, visually aligned with Prospect Board, and based on post types/templates rather than actual posts
- Report clips either play as exact standalone clips or do not open at all
- Full match video is never exposed from report clip playback again
