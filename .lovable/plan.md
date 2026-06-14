## Translate club outreach proposals

Let staff pick a language per outreach link. The public proposal page then displays every UI label, heading, and the per-player `fit_recommendation` text in that language.

### Languages
Use the existing 12 codes from `LanguageContext` (`en, es, pt, fr, de, it, pl, cs, ru, tr, hr, no`). English is the default and skips translation.

### DB migration (`club_outreach_links`)
- `language text not null default 'en'`
- `translations jsonb` — cached map `{ ui: { key: translatedString }, fits: { [player_id]: translatedString } }`
- No new policies needed; existing ones cover the columns.

### Edge function `translate-club-outreach`
Input: `{ short_id: string, language: LanguageCode }`.

Behaviour:
- If `language === 'en'`, clear `translations` and set `language = 'en'`.
- Otherwise:
  1. Load the link, joined player rows (for `fit_recommendation`).
  2. Build a fixed bundle of UI strings used by `ClubOutreachProposal.tsx` (titles, section headings, button labels, footer copy, empty-state text) keyed by short ids like `hdr.proposal`, `btn.next`, etc. — defined server-side so the function owns the keyset.
  3. Append each player's `fit_recommendation` keyed by player id.
  4. Single Lovable AI Gateway call (`google/gemini-2.5-flash`) with tool-call schema returning `{ ui: {...}, fits: {...} }` mapping every input key to its translation. UK English preserved for proper nouns, football terminology localised, no markdown.
  5. Save back to `club_outreach_links.language` + `translations`.

Return the cached object.

### Staff UI (`ClubOutreachManager.tsx` → outreach dialog)
- Add **Language** dropdown (same 12 options) to both Club and Agent outreach dialogs.
- On Save:
  1. Upsert the link as today (English fields stay canonical).
  2. If language `!== 'en'`, call `translate-club-outreach` and wait for cache write; show toast "Translating…".
- Add a small **Re-translate** button on existing rows when a language is already set (re-runs the function — needed if `fit_recommendation` changes).

### Public reading (`get-club-outreach`)
- Add `language` and `translations` to the returned payload.

### Proposal page (`ClubOutreachProposal.tsx`)
- Receive `language` + `translations` from the API response.
- Introduce a tiny local helper:
  ```ts
  const tr = (key: string, en: string) =>
    language === 'en' ? en : (translations?.ui?.[key] ?? en);
  const trFit = (playerId: string, en: string) =>
    language === 'en' ? en : (translations?.fits?.[playerId] ?? en);
  ```
- Wrap every literal English label currently in the JSX with `tr('key', 'English')` and the per-player `fit_recommendation` render with `trFit(player.id, fit)`.
- Set `<html lang={language}>` via a `useEffect` so screen readers and search engines see the right language.
- Footer "risefootballagency.com" link unchanged.

### UK English + tone
- The AI prompt explicitly requests UK English equivalents for English fallbacks, preserves football terminology per the project's localisation memory, and keeps proper nouns unchanged.

### Files touched
- New migration adding `language` + `translations` to `club_outreach_links`.
- New `supabase/functions/translate-club-outreach/index.ts`.
- `supabase/functions/get-club-outreach/index.ts` — include the two new fields.
- `src/components/staff/ClubOutreachManager.tsx` — language dropdown + post-save translate call + re-translate button.
- `src/pages/ClubOutreachProposal.tsx` — consume `language` / `translations`, replace literals with `tr(...)` / `trFit(...)`, set `<html lang>`.

### Non-goals
- Not adding a viewer-side language switcher (language is fixed per link as the user requested).
- Not translating dynamic stats numbers, player names, or club names.
