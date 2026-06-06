## Cause

The proposal page calls the `get-club-outreach` edge function, but that function is not deployed yet — a direct curl returns `NOT_FOUND`. The browser surfaces this as "Failed to fetch" because the request never reaches a function and CORS headers are absent from the gateway 404.

## Fix

1. Deploy `get-club-outreach` (auto-deploys with `verify_jwt = false`, which is what we want — clubs open the link without logging in).
2. Harden the client fetch in `src/pages/ClubOutreachProposal.tsx` so future failures show a real reason instead of a generic "Failed to fetch":
   - Send both `apikey` and `Authorization: Bearer <anon>` headers (required by the gateway).
   - On a thrown fetch error, show the error message; on non-OK, read the JSON body and show `error` text.
3. Quick smoke test by curling the deployed function with a real `short_id` from `club_outreach_links` and confirm a 200 payload.

No schema or UI changes. Pure deploy + small client error-handling tweak.