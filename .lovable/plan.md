## Problem

Club outreach visits sometimes don't show under "Viewed" even when the recipient definitely opened the link. Two things cause this:

1. `src/lib/visitorFilters.ts` → `isRealNonUkVisit` returns `false` whenever `location.country` is empty. Any visit where geo lookup fails (private IP, VPN, proxy, ip-api rate limit, mobile carrier NAT) is silently dropped.
2. `supabase/functions/track-visit/index.ts` only calls free `http://ip-api.com` once. If that one call fails or times out we have no country, so the visit is hidden.

The visit row IS being inserted into `site_visits` in those cases — it just never reaches the Viewed UI.

## Fix

### 1. Track even without geo (UI side)
- Add a new predicate `isViewableProposalVisit` in `visitorFilters.ts`: passes a visit when UA is not a known bot, regardless of whether country is known. Confirmed UK visits are still excluded; **unknown country is now included** (rather than dropped).
- `ClubOutreachManager.tsx` and `RepresentationOffers.tsx` switch their "Viewed" feeds to `isViewableProposalVisit`. The `ProposalVisitorsBell` keeps the strict non-UK filter so the pulsing bell only fires for confirmed non-UK traffic (no change there).
- `ViewedVisitorsExpansion.tsx` shows `Location unknown` for visits with no resolved country so it's obvious why one is included.

### 2. Tighten the bot filter so unknown-geo doesn't flood
- Keep current UA blocklist.
- Add a `min duration ≥ 2s OR referrer is set OR has a real UA` guard so 0s prefetch hits don't pollute the Viewed list.

### 3. Better geo on the server
`supabase/functions/track-visit/index.ts`:
- Use Cloudflare's `cf-ipcountry` header first (instant, no network call) and persist `location.country` from it when available.
- If `cf-ipcountry` is missing, race the existing ip-api lookup against a 1.5s timeout with `ipapi.co/{ip}/json/` as a fallback.
- Always insert the row even if both lookups fail (already does) — country just stays null.
- Store the raw client IP in `location.ip` so staff can identify a visitor across pages without geo.

### 4. Reliable duration write
- Switch the unmount `supabase.functions.invoke` in `usePageTracking.ts` to `navigator.sendBeacon` to a small `track-visit-beacon` path on the same edge function (accept beacon body too) so duration updates survive tab close. Today the in-flight `invoke` is cancelled when the page unloads, so short visits look like 0s and get filtered out.

### 5. Manual "Mark as viewed"
Add a small `Mark viewed` action on every outreach card. Stores into a new `manually_viewed_at` column on `club_outreach_links`. The Viewed section unions automatic visits with manually-marked rows so you can promote a row you know was opened (e.g. the recipient told you on WhatsApp).

## Technical Notes
- New column: `club_outreach_links.manually_viewed_at timestamptz null`.
- No change to `site_visits` schema.
- `isRealNonUkVisit` stays in place for the notification bell to avoid pulsing on unresolved-geo noise.
- `isViewableProposalVisit` is the new, looser predicate used only for the Viewed grouping and counts.

## Files Touched
- `src/lib/visitorFilters.ts` — add `isViewableProposalVisit`.
- `src/components/staff/ClubOutreachManager.tsx` — use new predicate, add Mark viewed action, union manual flag.
- `src/components/staff/RepresentationOffers.tsx` — same predicate swap + Mark viewed.
- `src/components/staff/outreach/ViewedVisitorsExpansion.tsx` — show `Location unknown`.
- `src/hooks/usePageTracking.ts` — `sendBeacon` on unload.
- `supabase/functions/track-visit/index.ts` — CF header first, ipapi.co fallback, beacon body parse.
- Migration: add `manually_viewed_at` to `club_outreach_links` and equivalent column on the offers table.
