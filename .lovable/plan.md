## Goal

When the viewer toggles the language pill on `/club-proposal/...`, every visible string should switch to the contact's language — not just the small set currently pre-translated.

## What's broken today

`ClubOutreachProposal.tsx` builds `tr(key, en)` from `data.link.translations.ui`, which is a pre-baked bundle written by the `translate-club-outreach` edge function. That bundle (`UI_BUNDLE`) only contains ~25 keys and the function only translates what's listed. Everything else — including the labels the user called out — either has no matching key, lives in a sub-component that ignores `tr`, or is freeform copy written per player.

## Plan

### 1. Expand the canonical UI bundle (`supabase/functions/translate-club-outreach/index.ts`)

Add the missing static keys so they get pre-translated next time a link is saved:

- `hdr.to` → "To"
- `picker.backToPlayers` → "Back to all players offered"
- `picker.learnMore` → "Learn more"
- `key.title` → "Key Details"
- `key.club`, `key.position`, `key.nationality`, `key.league`
- `key.contractExpiry`, `key.currentSalary`, `key.salaryExpectations`, `key.transferFee`, `key.height`, `key.preferredFoot`, `key.status`, `key.custom`
- `situation.title` → "Situation"
- `form.stat.<key>` for every entry in `STAT_LABELS` (Goals, Assists, Dribbles /90, Pass %, etc.) — both the FormBannerCard set and the MatchByMatchCard set, deduped.
- `season.stat.<header>` is unbounded (freeform), so we leave it to the runtime fallback in step 3.

After re-deploy, also trigger a one-off backfill: invoke `translate-club-outreach` for every existing `club_outreach_links` row that already has a non-en `language`, so old links pick up the new keys without the user re-saving each one.

### 2. Wire the new keys into the page (`src/pages/ClubOutreachProposal.tsx`)

- Pass `tr` into `FormBannerCard`, `SeasonStatsCard`, `InNumbersCard`, `StrengthsCard` and use `tr(\`form.stat.${key}\`, humanizedFallback)` for every stat label rendered.
- Replace the hardcoded `"To"` literal under the contact name with `tr("hdr.to", "To")` (the key already exists in the JSX — it just needs to be added to the bundle).
- Translate the position chips at the top and the Position tile's value through a small `translatePosition()` helper that maps `player.position` / `position_slot` against `portalTranslations` (`goalkeeper`, `centre_back`, `full_back`, `midfielder`, `winger`, `striker` and the abbreviations GK/CB/FB/CM/WG/ST/CF). Codes stay as codes; full English names get localised.

### 3. Runtime AI fallback for everything dynamic

The freeform content — Key Details descriptions, In Numbers labels & descriptions, Season Stat headers, Strengths bullet points, Situation paragraph, and any UI key the stored bundle is missing — must translate on the fly when `langOverride !== "en"`.

- Use the existing `useAutoTranslateStrings(strings, lang)` hook (already used elsewhere). Collect every dynamic string for the active player into one array, call the hook with `langOverride`, then wrap each render site in `translate(value)`.
- Strings to feed it: each `key_details` description/label/value, each `top_stats` label + description, each `season_stats` header (humanised), each strengths bullet, the `situation` paragraph, and the FormBannerCard stat labels (so old links without the new bundle keys still translate). The hook caches in localStorage, so the second load is instant.
- Skip numbers, dates, currency, flags and the position abbreviations — only translate human-readable English copy.

### 4. Verify

After deploying:
- Open the current proposal route, toggle the pill — confirm "To", "Back to all players offered", Key Details labels, position, form stat labels, In Numbers labels, Season Stats headers, Strengths bullets and Situation paragraph all switch language.
- Toggle back to English — everything returns to the original copy.
- Reload — translated copy appears immediately from cache.

## Technical notes

- `UI_BUNDLE` lives at `supabase/functions/translate-club-outreach/index.ts` and is consumed via `club_outreach_links.translations.ui`. New keys take effect for old links only after re-running the function for that row — that's why step 1 includes a backfill loop.
- `useAutoTranslateStrings` already exists at `src/hooks/useAutoTranslateStrings.ts` and uses `ai-translate-batch`. It accepts a portal-language code and caches per language in localStorage, so adding it to this page is cheap and idempotent.
- No schema changes required.
