I’ll fix the Viewed cards properly rather than relying on the current hover wrapper.

Plan:
1. Replace the current hover-card trigger with a simple controlled hover/click detail panel on the actual gold “5 views · location” pill, so hovering that exact pill opens the visitor detail reliably.
2. Make the detail panel wide enough for the staff UI, keep it above the card, and include each view/session with location, country, IP if available, device, total time, referrer and pages viewed.
3. Apply the same fix to both Club Outreach and Player Outreach viewed cards.
4. Remove the “Non-UK visitors” wording next to the Viewed heading in both sections, leaving just “Viewed”, the count and the gold divider.

Technical notes:
- I’ll update `ViewedVisitorsExpansion.tsx` so it no longer depends on Radix HoverCard behaviour for this small pill.
- I’ll update the two Viewed section headings in `ClubOutreachManager.tsx` and `RepresentationOffers.tsx`.
- I’ll preserve the existing visitor filtering logic, because the request is about the UI not opening and the label text.