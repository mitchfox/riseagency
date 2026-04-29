I understand the issue now: previous changes only inserted many new English translation rows, but the non-English columns are still empty for most of the representation page. Because the page intentionally renders before translations finish loading, it falls back to English and the page appears untranslated. I’ll fix both the missing data and the rendering behaviour.

Plan:

1. Fix the intro reveal so the actual page is visible behind the shader
   - Remove the shader phase’s solid black/background plate that is currently covering the page underneath.
   - Keep the Representation main screen mounted as soon as the shader phase starts.
   - Make the shader/logo layer itself fade from visible to transparent over the already-mounted page, so the user sees the main screen through the fade rather than getting black then page.
   - Keep the player/home screen animation from starting too late by removing or reducing the delay on the player overlay fade-in during the shader reveal.

2. Balance the intro line break
   - Force the fourth intro line to break as:
     ```text
     Work With Us
     To Make It A Reality
     ```
   - Keep this as the English fallback and translation source where appropriate, so it is not left to browser wrapping that creates one-word second lines.

3. Language selector hover colour
   - Update the language selector trigger on the representation main screen so hovering the selector box turns its background Rise Gold with dark text.
   - Ensure the flag and language abbreviation remain readable while hovered.

4. Fix the hero subtitle translation issue
   - The key currently used for the hero subtitle is `representation.hero_subtitle_v2`.
   - In the database it only has English filled in, so every other language falls back to English.
   - Fill all 11 non-English language columns for that key and its older alias where needed.
   - Also correct the spelling in the English source to “Experienced”, not “Experiecned”.

5. Fill all remaining representation translations
   - Update every `representation.*` key used on `/representation` so Spanish, Portuguese, French, German, Italian, Polish, Czech, Russian, Turkish, Croatian and Norwegian are filled.
   - This includes: Scouting, FAQs, Back to all, section titles, card subtitles, scouting copy, expectations, performance copy, Inside Performance, Tap for more, performance service blurbs, example links, CTA labels and form/WhatsApp labels.
   - Remove user-facing em dashes from these strings as part of the update.

6. Fix scouting network text on the representation page
   - Ensure the scouting section uses translation keys for:
     - Eyes Across All Of Europe
     - Scouting Network
     - intro blurb
     - Deep European Network
     - Future-Focused Scouting
     - Complete Player Knowledge
     - What we look for
     - Position breakdown
     - What we look for in your position
   - Fill all non-English values for these keys.

7. Localise scouting position breakdown labels
   - The recommended position label currently displays the raw English scouting position, e.g. “Central Defensive Midfielder”.
   - Add/use translation keys for the eight scouting position group names and render them through `t()`.
   - Also translate the domain chips: Physical, Mental, Technical and Tactical.
   - For the skill names/descriptions shown in the position breakdown, either add translation keys for the displayed scouting skill content or route them through stored translation rows so that section is not English-only.

8. Verify the database cause and avoid the same failure
   - Do not create another migration that only seeds English.
   - Use the proper data update path to populate existing translation rows and insert any missing rows with all language columns filled.
   - If there are still many missing translation rows after that, use the existing translation backfill function or direct full-language inserts/updates so the page is complete immediately, not dependent on future background work.

9. Final checks after implementation
   - Check the representation page in at least Polish and one other language.
   - Confirm the hero subtitle no longer remains English.
   - Confirm the copied Scouting and Inside Performance content is translated.
   - Confirm the shader fades over the visible main page, not over black.
   - Confirm the language selector hover background turns Rise Gold.