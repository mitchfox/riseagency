
## Goal

Match the depth of behavioural insight Wix gave you — for every visit, capture not just "they loaded the page" but **what they actually did**: how far they scrolled, which sections they paused on, which buttons / videos / images they tapped, when they went idle, and when they left. Surface all of it in the staff Viewed panel.

The good news: we already have `site_visits` + `usePageTracking` + the Viewed Visitors popover. We just don't record any in-page behaviour. We can add it without any third-party service (no Hotjar/Wix Analytics), keeping it private and on Lovable Cloud.

## What we'll capture (per visit)

1. **Scroll depth** — max % of page reached, plus a timeline of 25/50/75/100% milestones with timestamps.
2. **Section dwell** — for any element tagged `data-track-section="hero"` (we'll tag the major sections of RiseWithUs, Representation, Club Proposal, Agent Proposal, Proof of Rep), record how many seconds it was actually on screen using IntersectionObserver.
3. **Clicks / taps** — every click on a button, link, video play control, image, or anything with `data-track="…"`. Stored as `{label, ts, x%, y%}` so we know *what* and *where*.
4. **Video engagement** — for each `<video>`: play count, total watch seconds, max % reached, and whether they hit fullscreen. Hooks the existing players (proposal hero video, season-data video, highlight clips).
5. **Active vs idle time** — split total duration into "engaged seconds" (mouse/touch/scroll/key activity in last 30s) vs idle. Wix's "time on page" was really engaged time; this matches it.
6. **Tab visibility** — pause the timer when the tab is hidden so a backgrounded tab doesn't inflate dwell.
7. **Device + viewport + referrer + UTM** — already partial; we'll round it out (viewport size, orientation, connection type if available, UTM params from the URL).
8. **Page path history within a session** — if they jump from the proposal hub into a player profile, we link those visits together via `visitor_id` so staff see one journey, not two unrelated rows.

All of this writes to **one row per visit** (the existing `site_visits` row) into a new `events jsonb` column, plus a few denormalised summary columns for fast filtering.

## Schema changes

Add to `public.site_visits`:

- `scroll_max_pct int` — highest scroll % reached
- `engaged_seconds int` — active time, excluding idle and hidden-tab
- `events jsonb default '[]'` — append-only event list (`{t, type, ...}`)
- `sections jsonb default '{}'` — `{ "hero": 12, "videos": 47, ... }` seconds visible
- `viewport jsonb` — `{w, h, dpr, orientation}`
- `utm jsonb` — `{source, medium, campaign, content, term}` from query string

No changes to existing columns, no breaking changes to current readers.

## Tracking architecture (client)

Create one new hook `useBehaviourTracking(visitId)` mounted by the existing `usePageTracking` once it has a `visitId`. It owns all listeners and a single in-memory buffer:

```text
buffer = { events: [], sections: {}, scrollMax, engagedSeconds, videoStats }
```

- **Flush cadence**: every 10 s while the page is open, on `visibilitychange → hidden`, and on unload — the unload flush uses `navigator.sendBeacon` (we already added beacon support to `track-visit` for duration). The 10 s cadence is the key Wix-like improvement: it means even if the browser kills the unload handler, we lose at most 10 s of behaviour, never the whole visit.
- **Idle detection**: a 30 s inactivity timer reset by `mousemove / touchstart / keydown / scroll / click`. Engaged seconds only tick while not idle and not hidden.
- **Section observer**: `IntersectionObserver` on `[data-track-section]` elements; accumulates seconds while `intersectionRatio ≥ 0.4`.
- **Click capture**: single delegated listener on `document`, derives a human label from `data-track`, `aria-label`, button text, or `<img alt>`. Coordinates stored as % of viewport so they're meaningful across devices (lets us build a heatmap later).
- **Scroll**: `requestAnimationFrame`-throttled, only writes a milestone event when crossing 25/50/75/100%.
- **Video**: looks for `[data-track-video]` (or all `<video>`) on mount and on DOM mutation, attaches `play/pause/ended/timeupdate/fullscreenchange` listeners. We get watch time without instrumenting each player file individually.

This is one hook, ~250 lines, no per-component changes except adding a handful of `data-track-section="…"` and `data-track="…"` attributes on the proposal/representation/RiseWithUs pages.

## Tracking architecture (server)

Extend `supabase/functions/track-visit/index.ts` to accept a third call type alongside the existing `isInitial` / duration update:

- `kind: "behaviour"` with `{ visitId, partial: { events, sections, scrollMax, engagedSeconds, videoStats, viewport, utm } }`.

The function merges into the existing row:

- `events` and (per-section) `sections` use jsonb concat / numeric max so partial flushes from sendBeacon never overwrite each other.
- `scroll_max_pct` and `engaged_seconds` take the max of stored vs incoming.
- `viewport` and `utm` are set once on first behaviour flush.

Done as a single `update` with `jsonb || '...'` expression in SQL via `supabase.rpc` — or, simpler, read-modify-write inside the edge function because writes are serialised per visit by `visitId`.

## Staff UI — Viewed Visitors panel

Upgrade `ViewedVisitorsExpansion.tsx` (and the equivalent on player outreach) to show, per session:

1. Existing line: location · device · referrer · total dwell.
2. **New line**: `Engaged 1m 42s · Scrolled 78% · 3 clicks · Watched hero video 0:41 / 1:20`.
3. **Expandable timeline** (click to open): ordered list of events with timestamps — `0:00 opened`, `0:04 scrolled 25%`, `0:12 tapped "View Season Data"`, `0:30 hero video → played 14s`, `1:05 reached Videos section`, `1:42 left`. Just a `<ol>` reading `events` + `sections`.
4. **Heatmap mini-thumbnail** (optional, deferred): a tiny grid of click coords on a faded screenshot of the proposal layout.

Bell notification logic stays the same (non-UK count). The "Mark viewed" manual button stays.

## What we *won't* try to copy from Wix

- Per-element session recording video (rrweb): privacy-heavy, ~80 KB script, ~1 MB per visit storage. Can add later behind a staff toggle if you want it; flagging here so we don't silently bloat storage.
- Form-field analytics: not needed — the only public forms are the request representation and meeting request, and both already log full submissions to `form_submissions`.

## Rollout

1. Migration: add the 6 columns to `site_visits`.
2. Edge function: add `behaviour` branch with merge logic.
3. New `useBehaviourTracking` hook + minimal `data-track-section` / `data-track` attributes on RiseWithUs, RequestRepresentation, ClubProposal, AgentProposal, ProofOfRepresentation pages.
4. Upgrade `ViewedVisitorsExpansion` (used by both ClubOutreachManager and RepresentationOffers / PlayerOutreach) to render the new metrics + timeline.
5. Backfill is not needed — old rows just show what they show today; new rows get the richer view.

## Technical notes

- `events` capped at 200 entries per visit client-side to keep payloads small; once full we keep first 50 + last 150 (so we always have the opening and the end of the visit).
- `engaged_seconds` is the field staff should read as "time on page" — matches Wix's reporting.
- All tracking is first-party, same-origin, no cookies, no third-party scripts — fits the existing privacy posture and stays out of Google Search indexing (proposal pages remain `noindex`).
- Beacon + 10 s interval combination means we should see ~100% capture even on mobile Safari and on share-link-then-close-tab behaviour, which is the main case currently dropping data.
