## 1. RiseWithUs detail view shows nothing in Italian (Antonio)

**Cause:** `DetailView` in `src/pages/RequestRepresentation.tsx` calls `useLanguage()` (global site language) for body content, while the RiseWithUs hub uses `usePlayerLanguageTranslations(player.portal_language)` for titles. When the prospect's `portal_language` differs from the visitor's site language, body content falls back / renders blank because keys aren't translated in the global language scope.

**Fix:**
- Make `DetailView` accept an optional `lang` / `t` override:
  - Add a `playerLang?: string` prop (and surface `translations` Map keyed by that lang).
  - Build a local `t` that mirrors `useLanguage`'s lookup but pulls from translations for the supplied language. Reuse the same hook as the hub: `usePlayerLanguageTranslations(playerLang)` and pass its `t` (plus its `translations` map) into `DetailView` for `translateSkillField`'s fuzzy lookup.
- Update `src/pages/RiseWithUs.tsx` to pass `playerLang={playerLang}` to `<DetailView>` so all detail sections (Performance, Scouting, Brand, Fees, FAQs, Network, Agreement, Expectations, Negotiation, sub-screens) translate using the prospect's language.
- Keep `RequestRepresentation`'s own use of `<DetailView>` unchanged (no `playerLang` prop = falls back to global `useLanguage`).
- `usePlayerLanguageTranslations` will need to also return its `translations` Map (or expose `language`) so skill fuzzy-match still works.

## 2. Club Outreach contact's club is wrong

**Current:** `club_outreach_club_contacts.club_id` reuses the outreach target club, so the proposal labels the contact (e.g. Lukas Vaculik) with the target club instead of his own club (Vysocina Jihlava).

**Fix (schema + UI):**
- Migration: add `contact_club_id uuid references public.club_map_positions(id)` to `club_outreach_club_contacts` plus `contact_club_name text`, `contact_club_logo_url text` (denormalised snapshot for fast public render).
- `SettingsDialog` → Club Contacts editor: add a club picker for "Contact's own club" separate from the outreach target. Save its id + name + logo url onto the contact row. Keep `club_id` as the lookup key (so a single outreach target can still surface this contact when matched) — or, better, decouple: rename `club_id` semantics to "intro target club", and store contact's own club in the new `contact_club_*` fields. Existing rows backfilled to copy current `club_id` → `contact_club_id` so visible state stays unchanged for existing entries.
- `supabase/functions/get-club-outreach/index.ts`: return `contact_club_name` and `contact_club_logo_url` (fallback through `club_map_positions` lookup using `contact_club_id`).
- `src/pages/ClubOutreachProposal.tsx`: in the Key Club Contact card, display the contact's own club name and logo (instead of the outreach target). Outreach target keeps appearing in the "Prepared for" header.

## 3. "Prepared for" should be the individual at the target club

**Current:** Already wired to `prepared_for_name`. Issue is wording in the manager — staff are confusing it with the bottom contact.

**Fix:**
- `OutreachDialog` in `ClubOutreachManager.tsx`: rename the field label to **"Prepared for (recipient at target club)"** with helper text "e.g. the sporting director at the club you're sending this to. This is different from the saved Key Club Contact."
- `ClubOutreachProposal.tsx` already renders `Prepared for {prepared_for_name}` — no change.

## 4. Pro outreach / Youth outreach / Player database table searches not filtering

**Cause:** `StaffSearchInput` resyncs `localValue` from the parent `value` prop on every parent render. While typing, parent re-renders (other state, scoring recalcs, etc.) feed the *pre-debounce* `value` back through `useEffect`, overwriting freshly-typed characters and effectively clearing the search before the 300ms timer commits.

**Fix:**
- In `src/components/staff/StaffSearchInput.tsx`, only sync from prop when the parent's value differs from the last value we committed (track via a ref). Specifically: when local input is "dirty" (a pending debounce timer is active), do not let an incoming `value` change overwrite `localValue` unless it is a genuine external clear (`value === ""` and our last commit wasn't ""). Also clear the debounce timer on unmount.
- Verify in preview that typing into Pro Outreach / Youth Outreach (table view) and Player Database filters the rows live.

## Files to touch

- `supabase/migrations/<new>.sql` — add contact club fields, backfill from current `club_id`.
- `supabase/functions/get-club-outreach/index.ts` — return contact_club_name/logo.
- `src/pages/RiseWithUs.tsx` — pass `playerLang` to `<DetailView>`.
- `src/pages/RequestRepresentation.tsx` — `DetailView` accepts `playerLang` and uses the player-language translator + translations map.
- `src/hooks/usePlayerLanguageTranslations.ts` — also return `translations` map.
- `src/pages/ClubOutreachProposal.tsx` — render contact's own club name + logo in the Key Club Contact card.
- `src/components/staff/ClubOutreachManager.tsx` — add "Contact's own club" picker in Settings club-contact editor; relabel "Prepared for" field with helper text.
- `src/components/staff/StaffSearchInput.tsx` — fix parent-sync clobber so debounced typing isn't reverted.
- `src/integrations/supabase/types.ts` — refresh types for new columns after migration.
