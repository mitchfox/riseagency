## Plan

1. **Footer branding**
   - Replace the bottom text “Rise Football Agency” with the existing `RISEWhite` logo asset.
   - Keep it subtle, centred, and sized so it reads as a brand mark rather than extra page copy.

2. **Header spacing and prepared-for name**
   - Make the three header lines use equal vertical spacing:
     - `Rise Football Agency presents`
     - player name / player count
     - `Prepared for ...`
   - Add a new editable field in **Edit/New Club Outreach** for the prepared-for person name.
   - Public page will show `Prepared for {person name}` and fall back to the club name only if that field is blank.

3. **Move club contact defaults into Settings**
   - Remove the club contact fields from each outreach link.
   - Add a **Club contacts** area in Club Outreach Settings where each outreach club can store:
     - contact name
     - contact role
     - WhatsApp number
     - contact button colour
     - contact image
   - The proposal will use the saved contact for the selected club.

4. **Agency contact image**
   - Extend Club Outreach Settings with agency contact details:
     - WhatsApp number
     - agent image
   - The public WhatsApp agent button will show the saved circular agent image when set.

5. **Club contact image**
   - Add upload support for a circular club contact image in Settings.
   - Show it in the public “Key Club Contact” button.

6. **WhatsApp links**
   - Remove the pre-written WhatsApp message from the agency WhatsApp URL.
   - Keep the direct `wa.me/{number}` link only.

7. **Video player behaviour**
   - Use the first Stars highlight video as the main player.
   - Make it attempt autoplay with sound on first open, with controls available. If the browser blocks sound autoplay, it will still be playable by the user.
   - Remove the player-photo poster so the browser can show the video’s own first frame/thumbnail instead.

8. **Player info strip above video**
   - Replicate the Stars profile top info strip more closely:
     - position
     - age
     - nationality flag + nationality
     - current club logo + club
   - Add robust image fallback so a bad club logo URL does not show a broken image icon.

9. **Fix Tyrese / FC Vysočina Jihlava logo lookup**
   - Improve current club logo resolution in the backend function by using case-insensitive matching and falling back through:
     - parsed Stars bio current club logo / tactical formation logo
     - `players.club_logo`
     - `club_map_positions.image_url`
   - Frontend will hide failed images and show initials instead of a broken icon.

10. **Proof of Representation blocked URL**
   - Avoid exposing the blocked backend storage URL directly in the page link.
   - Add a public app route, e.g. `/club-proposal/:shortId/proof/:playerId`, that fetches the signed proof URL at click time and redirects/open-loads it from within the app.
   - Update the proof card to use this app route so browser extensions are less likely to block the visible target URL.

11. **Key Details alignment**
   - Lock icon/flag/logo rows to consistent heights.
   - Let long text wrap underneath without pushing flags/logos out of alignment.

12. **Optional outreach page sections**
   - Add per-link visibility toggles in New/Edit Club Outreach for Stars-derived sections:
     - Form
     - In Numbers / data
     - Season stats
     - Strengths / play style
   - Backend returns the same parsed Stars profile data and form config needed for those sections.
   - Public proposal renders the selected sections in the same visual language as the Stars profile, using Rise Gold `#cbb96b` accents.

## Technical notes

- This needs a database migration to add the new settings/default columns while keeping existing data safe.
- The edge function `get-club-outreach` will return settings, contact defaults, display options, parsed profile data, form data, and improved club logo fields.
- The affected files will be:
  - `src/components/staff/ClubOutreachManager.tsx`
  - `src/pages/ClubOutreachProposal.tsx`
  - `supabase/functions/get-club-outreach/index.ts`
  - `src/integrations/supabase/types.ts`
  - a new migration for outreach settings/contact/display fields