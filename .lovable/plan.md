
Targeted follow-up changes to the club proposal page and outreach editor:

1. **Mandate wording simplification**
   - Change the section heading from **Mandated Representation** to just **Mandated**.
   - Replace the body copy:
     - Old: "Rise Football Agency has mandated David Kiselak to act on Michael's behalf. Please speak with them directly to progress this conversation."
     - New: "**[Mandated agent name]** is mandated to act on **[Player first name]**'s behalf."
   - Keep the existing header line "[Agent] Presents" / "Mandated by RISE Football Agency" unchanged.

2. **New "Suggested" mode for mandated proposals**
   - Add a toggle in the staff outreach editor (visible only when Mandated is enabled) called **Send as Suggestion to mandated agent**.
   - When this toggle is on, add a free-text field **Note to the mandated agent** so the staff member can write a short personalised message for each agent.
   - On the public proposal page, when Suggested mode is active:
     - Render a banner pinned at the very top of the page (above the hero) that contains:
       - A short fixed line: "Preview of a proposal we'd like you to send on this player's behalf."
       - The personalised note entered by staff, shown beneath it.
     - Style it consistently with the existing dark + Rise Gold accent system, full width, dismissible-looking but persistent (no close button needed).
   - The rest of the proposal renders exactly as a normal mandated proposal would.

3. **Database**
   - Add two columns to `club_outreach_links`:
     - `is_suggested_to_agent boolean default false`
     - `suggested_agent_note text`
   - Update the `get-club-outreach` edge function to return both fields.

Technical notes:
- One database migration for the two new columns, with grants/RLS unchanged (existing policies cover these columns).
- Edits limited to: migration, `get-club-outreach/index.ts`, `ClubOutreachManager.tsx` (editor toggle + note field + mandate wording preview), `ClubOutreachProposal.tsx` (heading change, body copy change, suggestion banner).
- No changes to video, formation, or In Numbers code in this pass.
