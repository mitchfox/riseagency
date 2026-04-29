I’ll fix this as a language propagation and translation-coverage issue, not another partial patch.

Plan:

1. Keep `/representation` on the main page when changing language
   - The existing intro skip flag is defined but not actually used.
   - Initialise the representation intro state from `sessionStorage` so once the intro has completed, skipped, or the page is already in use, language switching does not replay it.
   - Set the flag when the intro completes and before triggering a language switch from the representation page.
   - Keep this scoped to the current session so a fresh visit can still show the intro.

2. Preserve `?lang=` through portal example login
   - Fix the portal auth flow so `/portal?staff_login=...&lang=pt` stores `portal_language_hint=pt` before it cleans the URL.
   - Prevent the Cristiano demo player’s saved default language from immediately overwriting the language the visitor arrived with.
   - Result: if the user is browsing representation in Portuguese, the Cristiano portal opens in Portuguese even after the URL is cleaned.

3. Translate the portal example hub, analysis and data tabs from the propagated language
   - Pass the active `portalLanguageHint` into the portal example areas that still rely on hardcoded English.
   - For `AnalysisVideoReports`, replace English labels, toasts and clip category names with existing portal translation keys where available and add missing keys where needed.
   - For `AnalysisDataTab`, localise visible headings and controls such as Data, Player Summary, Name, Age, Club, Minutes Played, Season R90, Matches, Season Averages, select-all style controls and chart/table labels that currently render in English.
   - Keep player names, club names, opposition names and raw stored football data unchanged unless there is translated report content for it.

4. Fix the standalone performance report language selection
   - The current report viewer only uses stored `translated_content` if the report itself has a translation. Cristiano’s example report currently has no stored `translated_content`, so `?lang=pt` still shows English action types.
   - Change report rendering so the requested language from `?lang=` controls all UI labels regardless of stored report content.
   - Add a safe action-type translation helper for common action labels such as Applied Pressure, Loose Ball, Hold-Up Play, Offensive Positioning, Offer In Behind, Aerial Duel, Triple Threat, Shot, Pass, Foul, Fouled, Dribble, Cross and combined comma-separated labels.
   - This means the example report can display translated UI and translated action labels even when the saved report body has not been manually translated.

5. Translate the standalone analysis example UI
   - Update `AnalysisViewer` to read `?lang=` using the same portal translation helper.
   - Replace hardcoded UI labels including Loading Analysis, Analysis not found, Go Back, Watch Video, Jump to Section, Key Info, Analysis Points, Overview, Opposition Strengths, Opposition Weaknesses, Potential Matchups, Scheme, Strengths & Areas for Improvement, Back to Top, Concept and Explanation.
   - Where analysis body content is stored only in English, leave the actual analyst-written content untouched until a translated content store exists, but remove the English UI chrome around it.

6. Fix “Return to all / Return to Performance” labels fully
   - Add any missing `representation.back_to_*` translation rows for all supported public languages.
   - Make both the top detail back pills and the sticky bottom return button use the same translated labels.
   - Verify the exact labels no longer fall back to English on Portuguese.

7. Add missing translation keys in code and database
   - Extend the existing portal UI translation map for the new labels used by portal examples, performance reports and analysis examples.
   - Add or update representation database translation rows for the return labels and any missing section controls.
   - No schema changes are needed.

8. Verification
   - Check `/representation?lang=pt`, skip the intro, change language and confirm it stays on the main representation page.
   - From Portuguese representation, open the Cristiano portal, performance report and analysis example.
   - Confirm the portal shell, analysis/data examples, report controls, return buttons and standalone analysis UI use Portuguese rather than English.
   - Spot check English still works and real portal behaviour is unchanged.