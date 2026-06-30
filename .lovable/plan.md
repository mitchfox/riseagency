Plan:

1. **Make the Add Players controls impossible to miss**
   - Remove the breadcrumb action approach.
   - Keep Player Database as its own staff route/section.
   - Add a thin, always-visible action strip directly above the Player Database content, with compact buttons only:
     - Add players
     - AI bulk add
     - Manual add if needed
   - Opening Add players will expand inline immediately below that strip, not as a huge block and not collapsed inside another card.

2. **Add Create Player Outreach inside the player pop-up**
   - Add a compact **Create player outreach** button beside Edit in the Player Database player detail dialog.
   - When clicked, it will create or update the matching player outreach record using the player details already known:
     - name
     - position
     - club
     - nationality
     - date of birth
     - Instagram handle where available
   - Then it will take you to **Player Outreach** with the new/updated offer visible and searchable by that player.
   - It will avoid duplicate player rows by matching name and date of birth where possible, then name fallback.

3. **Make Player Database pop-ups sharper**
   - Open the player detail dialog immediately using already-loaded row data.
   - Move slower hydration such as extra fit-score fields and notes loading behind the opened modal, so the pop-up is not blocked.
   - Do not mount the notes board until the detail view is open and visible.
   - Make the Edit button switch instantly, with any extra outreach-only fields loading in the background.
   - Keep the main table from re-fetching everything after small edits unless needed.

4. **Add Germany and Croatia scouting resource data**
   - Add Germany links into the existing Scouting country system across:
     - General
     - Senior
     - U21
     - U19
     - U17
     - U16
     - U15
   - Add Croatia links across the same useful bands, using HNS Semafor as the official identity layer.
   - Keep data and video links separate through labels/notes so the existing Data, Video, Players and Stats tiles work cleanly.
   - Use idempotent backend inserts so re-running does not duplicate existing links.

5. **Tidy the Scouting UI where needed for these countries**
   - Ensure Germany and Croatia open with clean age-group tiles and league rows.
   - Make long league/source names truncate neatly without breaking the glossy layout.
   - Keep the existing click-to-expand Data, Video and Stats pattern.

6. **Validation**
   - Verify `/staff?section=playerdatabase` shows the thin action strip and buttons immediately.
   - Verify clicking a player opens the pop-up quickly and Edit switches quickly.
   - Verify Create player outreach creates/updates the offer and lands on Player Outreach with the player present.
   - Verify Germany and Croatia appear in Scouting with populated age groups and correctly separated links.