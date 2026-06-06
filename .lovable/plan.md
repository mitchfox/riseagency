I’ll rebuild the recruitment surfaces around the exact issues you raised.

## What I will change

1. **Pipeline cards: space, actions and missing details**
   - Make the **Actions** control a full-width primary row across the card, not a tiny button.
   - Show key recruitment data clearly on every card: player name, AI score, position, age, current club, nationality flag where available, agent status, national team marker and follow-up state.
   - Pull in player database data where possible so pipeline cards can display **player image and club logo** when the outreach row only has the club name.
   - Keep the card layout more open and readable on mobile, with details on two lines where needed instead of cramped inline chips.

2. **Automatic pipeline ordering**
   - Sort every pipeline column by **AI fit score from best to worst** by default.
   - Keep overdue/follow-up information visible, but it will no longer override the main AI score ordering unless we explicitly add that later.

3. **Actions panel restructure**
   - Split the current messy panel into the correct sections:
     - **Player details & notes**: name, position, club, nationality, date of birth, age, email, player details and notes.
     - **Offer link**: live URL, copy, open, language, under-18/over-18 status, uploaded offer images and personalised message.
     - **Contact history**: log contact, follow-up date and interaction timeline.
   - Move nationality, club and date of birth out of offer-link settings and into player details.
   - Name, position and age bracket will be automatic from player details, with edits allowed where necessary.
   - Replace image URL input with proper **image uploads** using the existing offer image system, capped to the same number already used by the representation offer flow.
   - Rename “Short bio” to a **personalised message** field, save it to the existing representation offer intro text and enforce a practical character limit.
   - Remove “Create offer link” wording. Once a player is starred, they will be treated as already having a representation offer link. The button will be **Save offer details**.

4. **Starred player offer behaviour**
   - When a player is starred from the pipeline, ensure their linked player record is marked as having a representation offer, so the link already exists.
   - Opening Actions will edit that existing offer information rather than presenting link creation as a separate task.

5. **Prospect board visual rebuild**
   - Replace the current rigid prospect cards with a proper polished card system matching the pipeline: larger player image/initials, score prominence, club logo, position, age, priority, weighted value and stage cues.
   - Improve column headers with counts and weighted value so the board feels useful, not just decorative.
   - Use responsive horizontal board behaviour on mobile with stronger spacing, readable cards and visible controls.
   - Remove hardcoded inline colour styling where practical and use the existing Rise Gold dark design tokens.

## Technical notes

- Main files: `OutreachPipelineBoard.tsx`, `InlinePlayerActionsPanel.tsx`, `ProspectBoard.tsx` and recruitment CSS in `index.css`.
- I will reuse the existing `players`, `player_offer_settings` and `player_portal_settings` fields, so this should not need a database schema migration.
- Image uploads will go through the existing `marketing-gallery` storage bucket, matching the current offer customiser pattern.
- I will avoid popups for the pipeline Actions flow and keep it inline as requested.