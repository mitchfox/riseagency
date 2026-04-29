I found two separate issues causing the English text to leak on `/representation`.

1. The scouting block was copied visually from the players/scouts pages, but the representation page uses new keys such as `scouting_network.card1_title`. Those keys do not exist in the database, so the page falls back to English.
2. The position breakdown renders the raw `POSITION_SKILLS` data directly. The Scouts page already has translated skill keys, but representation is not using that translation lookup.
3. The intro skip button is hardcoded as `Skip`, with no translation key.
4. The Cristiano report/analysis/portal example links do not carry the current language into the opened page. The report dialog also forces `en` unless it is opened from the portal.

Plan:

1. Fix the hardcoded skip button
   - Change `src/components/RepresentationIntro.tsx` from hardcoded `Skip` to `t("representation.skip", "Skip")`.
   - Add or apply the `representation.skip` translation row for all supported languages.

2. Fix representation scouting section translation keys
   - In `src/pages/RequestRepresentation.tsx`, switch the copied scouting network text back to the existing translated keys from the Players page:
     - `home.eyes_across_europe`
     - `home.scouting`
     - `home.network`
     - `home.scouting_desc`
     - `home.scouting_point_1_title` / `_desc`
     - `home.scouting_point_2_title` / `_desc`
     - `home.scouting_point_3_title` / `_desc`
   - For representation-only labels such as `What we look for`, `Position breakdown`, `What we look for in your position`, and `Open any position...`, add/update proper `representation.*` keys rather than leaving them under missing `scouting_network.*` keys.

3. Fix position breakdown translations using the existing Scouts translations
   - Import or copy the Scouts helper logic into `RequestRepresentation.tsx`:
     - position display names/abbreviations
     - domain labels
     - skill title and skill description lookup
   - Render each scouting position through a translated position label rather than raw English, for example `Centre Forward / Striker` becomes the existing localized `scouts.pos_striker` label or a full-position translation if available.
   - Render each skill title and description using the existing `scouts.skill_*` rows, matching the Scouts page logic with legacy and compact slug fallback.
   - This uses the 151 already-translated Scouts skill rows currently in the database, instead of creating a second translation set.

4. Add missing representation/scouting utility translations in the database
   - Apply data updates, not schema migrations, for the missing rows such as:
     - `representation.skip`
     - `representation.what_we_look_for`
     - `representation.position_breakdown`
     - `representation.what_we_look_for_position`
     - `representation.open_position_hint`
     - optionally full position names if the existing Scouts abbreviations are too short for the representation page.
   - Verify the rows have non-empty Spanish, Portuguese, French, German, Italian, Polish, Czech, Russian, Turkish, Croatian and Norwegian columns.

5. Preserve language when opening Cristiano examples
   - Update the example report and analysis URLs in `RequestRepresentation.tsx` to append `?lang=${language}`.
   - Update the Cristiano portal button to append `&lang=${language}` and seed the demo player’s language hint in local/session storage before opening the portal.
   - This means a Portuguese user opens the Cristiano examples in Portuguese where translations exist.

6. Make the standalone report page respect the page language
   - Update `PerformanceReportDialog` to accept an optional language override, not only `isPortalView`.
   - Pass the current `useLanguage().language` from `src/pages/PerformanceReport.tsx` into the dialog.
   - Keep portal behaviour unchanged for real players.

7. Make analysis examples ready for language-aware viewing
   - Update `AnalysisViewer` to read the current language context or `?lang=` and use it for static UI labels like loading, overview, watch video, not found, quick-nav labels, and status labels.
   - If the analysis table does not yet store translated analysis body fields, keep source analysis content as-is, but ensure every UI label around it opens in the selected user language. If translated analysis content exists later, the same language parameter can be used to select it.

8. Verification
   - Check `/representation?lang=pt` and navigate through:
     - intro skip button
     - Scouting card
     - position breakdown
     - Centre Forward / Striker breakdown
   - Confirm no listed English strings remain when Portuguese translations exist.
   - Check Cristiano performance report, analysis and portal links from Portuguese and confirm the opened page receives the Portuguese language context.