## Highlights Maker portal

A new lightweight portal so external "Highlights Makers" can log in, see assigned players' clips/playlists, watch them in a Rise-style player and download individual clips or whole playlists. Plus a staff management surface to create accounts and assign players.

### 1. Database (new tables)

```text
highlight_makers
  id, username (unique, case-insensitive), password (plain text — explicitly low-security per request),
  display_name, status ('active' | 'disabled'),
  last_login_at, created_at, updated_at

highlight_maker_players
  id, highlight_maker_id (fk), player_id (fk), created_at
  unique(highlight_maker_id, player_id)
```

- RLS: deny all anon/auth access. All reads/writes go through edge functions using the service role, matching the existing scout pattern.
- Staff/admin can manage rows via existing `has_role` policies for staff UI calls that don't need edge functions.

### 2. Edge functions

- `highlight-maker-login-check` — body `{ username, password }`, returns `{ found: true, maker }` or `{ found: false }`. Case-insensitive username.
- `highlight-maker-data` — body `{ username }`, returns assigned players plus their playlists, performance reports with positive Action Score clips grouped by category, and the relevant fixtures/analyses. Validates the username matches a stored session token client-side via re-check.
- All functions use the established CORS + zod-validation pattern.

### 3. Staff UI — "Highlights Makers" management

New staff section (sidebar entry under team/access area):

- Table of all Highlights Makers (username, display name, assigned player count, status, last login).
- "Add maker" dialog: username + password (free-form text — letters/numbers/symbols allowed), display name. No email needed.
- Edit dialog: change password, rename, enable/disable, delete.
- Per-row "Manage players" dialog: searchable list of all players with checkboxes; saved to `highlight_maker_players`.

Permission gating mirrors existing admin/staff role checks.

### 4. Highlights Maker login page — `/highlights-login`

- Mirrors `ScoutLogin.tsx` look and feel (same marble bg, Rise gold accents).
- Username + password inputs, "Remember me".
- Calls `highlight-maker-login-check`. On success stores `highlight_maker_username` in localStorage/sessionStorage and navigates to `/highlights`.

### 5. Highlights portal — `/highlights`

Authenticated via `useHighlightMakerAuth` hook (same pattern as `useScoutAuth`). If no session → redirect to `/highlights-login`.

Layout:

- Header: Rise logo, maker display name, sign-out.
- Player picker: list/grid of assigned players (name, position, club badge, photo). Selecting one opens that player's workspace.
- Player workspace tabs:
  1. **Playlists** — exactly mirrors the playlist order and clip order used in staff/portal (reuse the existing playlist fetch + sort). Each playlist is collapsible, shows clips in given order. Click a clip → opens the existing Rise-branded clip player (re-use `HighlightReelPlayer` / staff clip viewer). Per-clip "Download" button. Per-playlist "Download all" button that fetches each clip URL sequentially and zips them client-side (JSZip already used elsewhere in highlight compiler) with a clean filename pattern `Player – Playlist – 01 Clip Name.mp4`.
  2. **Performance reports** — Wyscout-style report cards. For each report, show positive Action Score clips grouped by action category, ordered by R90/Action Score (reusing existing sorting helpers). Clicking any action plays it in the same player. Download buttons per clip and per category.

Read-only: no editing of playlists, reports or clips.

### 6. Routing & access

- Add `/highlights-login` and `/highlights` routes in `App.tsx` (public, lazy-loaded).
- Excluded from sitemap/robots and gated by login check on the portal route.

### 7. Out of scope

- No password reset flow (admin sets a new password from staff).
- No email notifications.
- No edit access for the maker — strictly view + download.

### Technical notes

- Reuse: `HighlightReelPlayer.tsx`, existing playlist fetch, performance report aggregation in `src/lib/reportActionHelpers.ts` and `actionSorting.ts`, `statAggregation.ts`. No new player UI built from scratch.
- Zip downloads: `jszip` (already a transitive dep via highlight compiler) + `file-saver`-style anchor click.
- Storage for passwords: stored plain text per explicit user instruction ("not that important to protect"). Add a brief inline comment in the migration noting this is intentional, and lock the table down to service-role-only access so passwords never leave edge functions.
