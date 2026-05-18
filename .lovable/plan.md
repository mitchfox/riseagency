Four independent workstreams in one pass.

---

## 1. RISE Investor Portal (`/investors-portal`)

New private dashboard, fully built with live tables. Not indexed.

### Database (new tables, RLS open to anyone with a valid `investor_session` token only via edge functions; direct client reads blocked)
- `investor_users` — username, password_hash (bcrypt), display_name, status, created_at
- `investor_sessions` — token, user_id, expires_at
- `investor_activity_log` — date, person, category (outreach/analysis/admin/travel/deal/communication), description, source ('manual'|'staff_activity'|'api'), external_ref
- `investor_spending` — date, category (tools/travel/staff/misc), vendor, amount_gbp, notes, source
- `investor_pipeline` — name, age_group, country, status (lead/contact/mandate/active/deal_in_progress), notes, expected_value_gbp, player_id (optional link)
- `investor_deals` — title, stage, counterparty, timeline_notes (jsonb), value_gbp, updated_at
- `investor_notes` — title, body, kind (founder/reflection/decision), created_at

All tables: RLS enabled, deny direct access. Reads/writes go through edge functions that verify the session token. This way client-side Supabase queries can't leak data even if the URL is guessed.

Seed `investor_users` with `levene` / `England4` (bcrypt-hashed). Auto-ingest hook: optional row insert via `investor-ingest` edge function for the existing `staff_activity_log` table (future automation point — not wired live now, just the endpoint).

### Edge functions
- `investor-login` — validates username + password, issues session token (30d)
- `investor-data` — single endpoint returning overview/activity/spending/pipeline/deals/notes for a valid token
- `investor-write` — handles inserts/updates/deletes on the six data tables (token-gated)
- `investor-ingest` — public-with-shared-secret endpoint for future automation (CSV / API)

### Frontend
- Route `/investors-portal` in `src/App.tsx` (lazy)
- `src/pages/InvestorsPortal.tsx` — handles unauth (login card) + auth (dashboard) states
- `src/components/investors/` directory: `Shader.tsx` (reuse RISE shader from existing component if available, otherwise a small WebGL/CSS gradient component), `LoginGate.tsx`, `Overview.tsx`, `ActivityLog.tsx`, `SpendingTracker.tsx` (with Recharts bar/line), `PlayerPipeline.tsx`, `DealsBoard.tsx`, `SystemNotes.tsx`
- Sidebar nav with the six sections, dark premium aesthetic, Rise Gold accents, smooth section transitions (framer-motion)
- Pre-login shader intro; post-login shader sweep transition; subtle success chime (reusing `src/lib/soundEffects.ts`), with mute toggle stored in localStorage
- `useInvestorSession` hook handles token persistence + auto-redirect

### Indexing
- Add `Disallow: /investors-portal` to `public/robots.txt`
- Add `<meta name="robots" content="noindex,nofollow,noarchive">` on the page

---

## 2. Stats Updater fixes

Two problems: (a) sidebar shows full category structure even when only a handful of sections are permitted; (b) all players are visible when only assigned ones should be.

### Sidebar
In `src/pages/Staff.tsx` `applyRoleVisibility`: after filtering, count the total visible non-group sections across all categories. If `<= 7` (configurable constant `FLAT_SIDEBAR_THRESHOLD = 7`), flatten — drop category wrappers and the `isGroupLabel` separators, render every section as a top-level item in a single ungrouped list. Categories stay as-is above the threshold.

### Player scoping
Audit usage of `useStatsUpdaterAssignments` — confirm every component a stats_updater can reach (`StaffOverview`, player pickers, fixtures editor, match data editor) filters by `allowedIds` when `isScoped` is true. Add the filter where missing. The hook itself is correct; the regression is at call sites.

Also: ensure the wrong sections (e.g. coaching, finance) don't appear at all — verify `role_permissions` seed for `stats_updater` and tighten if extra `can_view=true` rows exist.

---

## 3. Highlights Portal completion

Last pass left gaps. Finish:

### Player rail
Show club logos from each player's most-recent performance report (`analyses.club_logo_url`) on the player picker, matching how the staff performance report displays them.

### Video player
Replace the current player with the exact `ClippedActionsPlayer` already used on staff/portal (the imports are already there but the wrapper is wrong) — same controls, autoplay-next, action title overlay, R90/Action Score badge.

### Action score tiles
Reuse the staff performance report's action-tile component (same colour palette, same badge layout, same hover). Pull from `src/components/staff/...ActionsList` or shared util — don't reinvent in HighlightsPortal.tsx.

### Wyscout-style Video Reports tab
Currently embeds a stripped `AnalysisVideoReports`. Swap to the exact `AnalysisVideoReports` used on the Stars profile (`PlayerDetail.tsx`) with identical filters, match selectors, Best Actions, ZIP and Play-all.

### Playlists + uploads (shared with staff)
- New "My Playlists" tab inside each player view
- Create playlist (writes to existing `playlists` table with `is_favourite=true` by default so they appear everywhere)
- Upload clips: reuse `analysis-videos` bucket + `clipped_actions`-style flow; new clips attach to the assigned player and surface in the staff highlights compiler
- Add RLS so highlight makers can insert into `playlists` and `analysis-videos` only for assigned players (use a `has_highlight_maker_player_access(maker_id, player_id)` SQL helper)

---

## 4. Video Reports action-type merging

The categoriser in `AnalysisVideoReports.tsx` does shallow `includes()` matching, so "Tackle - Not Held", "tackle not held", "Tacle Not Held" all stay separate.

### Fix
New helper `src/lib/actionTypeNormaliser.ts`:
- `normaliseActionType(raw)` → strips punctuation, lowercases, collapses whitespace, applies a synonym map (`"not held" → "tackle"`, `"hdr"/"header won" → "aerial"`, common misspellings via Levenshtein distance ≤ 2 against a canonical list)
- Canonical list seeded from existing distinct `actions.action_type` values plus the Sportscode dictionary already in the codebase
- `canonicalActionType(raw)` returns the display label; `groupKey(raw)` returns a stable key used for counting and filtering

Update `AnalysisVideoReports.tsx`:
- Build `typeCounts` keyed by `groupKey`, displayed via `canonicalActionType`
- `actionMatchesTypes` matches by `groupKey`, so picking "Tackle" pulls in every spelling variant
- Display merged count next to each chip

Same helper reused in `HighlightsPortal.tsx` so the two stay in sync.

---

## Technical notes

- All new tables get RLS denying direct client access; edge functions hold the trust boundary for investor data
- Investor shader: prefer reusing an existing shader component if one exists in `src/components`; otherwise a lightweight WebGL plane with a noise/gradient fragment shader
- `public/robots.txt` keeps existing rules; only add `Disallow: /investors-portal`
- No changes to the staff/player portal video pipelines beyond the categoriser swap
- Highlights maker upload path: server-side edge function (`highlight-maker-upload`) checks maker→player assignment before issuing a signed upload URL

## Out of scope

- Multi-user invite system for investors (structure supports it; UI not built now)
- Wiring the existing staff activity log into `investor_activity_log` (ingest endpoint exists; cron/trigger to be defined later)
- Translating the investor portal (English only)
