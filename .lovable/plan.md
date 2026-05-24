## Sitewide audit and Football Manager-style UI suggestions

Two parts:
1. **Audit** — concrete improvement opportunities across public site, staff portal, player portal, and investor portal.
2. **FM-style upgrades** — interaction patterns to lift the player database and outreach to a Football Manager / Sports Interactive feel.

Pick what you want me to build first; each item is independently scoped.

---

### 1. Public site (risefootballagency.com + localised subdomains)

**Performance**
- Bundle bloat: `src/components` has 80+ top-level components. Audit `Landing.tsx` and `Home.tsx` for static-import chains that defeat the existing `lazy()` strategy. Convert hero/3D/cursor effects (`Player3DEffect`, `FluidCursor`, `LightConeBackground`, `MatrixPlayerEffect`, `SmokeOverlay`) to dynamic imports gated on viewport + reduced-motion.
- Add `<link rel="preload">` for the hero video poster + first webfont; defer `RepresentationAudio` until user gesture.
- Image audit: ensure every `LazyImage` has `srcSet` + `sizes` (existing srcSet helper applied only to some grids).

**SEO**
- Run `seo_chat--trigger_scan` to get scan-based findings; in parallel, manually verify: single H1 per route, canonical tags on localised duplicates (12 language subdomains create dupe-content risk — add `hreflang` cluster in `<head>`), JSON-LD `SportsOrganization` + `Person` schema on `/stars/:slug`.
- `public/sitemap.xml` is static — generate from routes + player slugs at build time.

**UX polish**
- Standardise scroll-reveal timing (memory says 30px fade-up) — sweep for one-off animations that drift.
- `NotFound.tsx` smart suggestions per memory — verify still firing.
- Add a global "press / to search" command palette (kbar-style) for staff + public.

---

### 2. Player portal

- **Performance discovery** memory mentions R90 ≥ 0.05 gating — verify the highlights gallery prefetches the next clip in queue (currently each click hits cold cache).
- **Music player**: cross-fade between tracks (already smart-fades on nav per memory) but no per-track volume normalisation — add ReplayGain-style normalisation on upload.
- **Offline shell**: the PWA service worker (`public/sw.js`) caches HTML but not the latest analysis JSON. Add a stale-while-revalidate for `/api/portal/*` GETs.
- **Mobile dashboard nav** (3-column dropdown per memory) — add swipe-between-sections gesture; currently tap-only.
- **Notifications**: player push notifications exist for staff side; add player-side push for new analysis / new highlight.

---

### 3. Staff portal — quick wins

- **Global search**: `useWidgetData` already aggregates; promote it to a Cmd-K palette covering Players, Fixtures, Reports, Tasks, Contracts, Network contacts. Single keystroke beats the current `SectionGridPicker` nav for power users.
- **My Tasks**: add Kanban swimlane view + bulk reassign; today it's a list.
- **Performance reports**: inline "duplicate previous report's actions as template" — recurring opponent reports rebuild from scratch.
- **Fixtures**: now that the `match_date + opponent` key is enforced, surface a "merge candidates" admin tool for legacy duplicates.
- **Activity log**: it exists but is buried — pin the last 5 events to the StaffOverview header strip.
- **Capacity planner**: add a weekly heat-strip per staff member showing over/underallocation; right now the battery icon hides the trend.
- **Transfer Hub**: the Roster + Contracts tabs are visually identical tables — consolidate, and add an "expiring within 6 months" filter chip row above.
- **Marketing schedule**: drag-to-resize day allocations, not just drag-to-reorder.
- **Coaching Database**: add tag-based filter on top of the current grid; currently search-only.
- **Error reporting**: dismissible toasts log to `staff_notification_events` (per memory) — add a "Recent errors" admin panel so they're actionable, not just logged.

---

### 4. Investor portal — quick wins

- **Business Plan**: now embedded, but read-only on mobile. Add inline edit parity once 390px layout fix lands.
- **Projections**: add a "Compare scenarios" two-up view (Worst / Expected / Best side-by-side totals).
- **Commission Cap**: add a colour-coded urgency band (red <30d, amber <90d) on the Rep. exp. / Contract dates.
- **Capacity**: per-staff sparkline of weekly hours allocated vs limit over the last 8 weeks.

---

### 5. Football Manager-style UI for Player Database + Outreach

The big visual upgrade. FM's strength is **dense, sortable, customisable tables with hover-rich previews and attribute polygons**. Concrete moves:

**A. Player Database — "Squad View"**
- Replace card grid with a dense FM-style table: avatar, name, age, position chip, club crest, contract bar, R90 sparkline, last-action timestamp.
- Column chooser dropdown (already partly there via `TableSettingsPopover`) — extend to save per-user view presets ("Scouting", "Contract review", "Form").
- Row hover → right-side slide-in panel with: attribute radar (use existing performance metrics), recent 5 fixtures, contract terms, agent quick-actions. No navigation needed for triage.
- Multi-select with bulk actions bar (assign scout, add to shortlist, send template message).
- Inline filter chips above table: position, age band, club country (flag picker), representation status, R90 percentile.
- Saved searches (FM's "Scouting filter") — persist as JSON per user.

**B. Player attribute polygon / radar**
- New `PlayerAttributePolygon.tsx`: 8–12 axis radar using existing R90 + action categories. SVG, themable, animates on mount. Reuse on player detail, modal, and table hover preview.

**C. Player Outreach — "Scouting Centre"**
- FM "Scouting Assignments" pattern: a left rail of active assignments (region, age, position, deadline), centre pane shows results pipeline (Identified → Watching → Recommended → Contacted → Signed) as a Kanban.
- Each card draggable across columns; drop triggers status update + auto-log to `agent_notes`.
- Right rail = selected prospect detail with the same attribute polygon + Transfermarkt link + last outreach log.
- "Next action due" red dot on cards past their follow-up date.

**D. Shortlist**
- Convert `TransfermarktShortlist` to FM "Shortlist" view: sortable table + drag-to-reorder priority + star rating column. Add a "scout report" composer that pre-fills from existing scraped data.

**E. Tactile FM touches**
- Bebas Neue / Agrandir Tight headers in section bars (already present) — apply consistently to table headers in dense views.
- Use Rise Gold (#C6A332) as the "selected row" left-border accent, 2px (matches brand memory).
- Add a thin status strip per row (form, fitness, contract) using 3 tiny pill-bars — FM's "traffic lights".
- Keyboard nav: arrow keys move row, Enter opens slide-in, Cmd-Click multi-selects, / focuses filter, ? opens shortcut sheet.
- Subtle row hover sound (per existing audio/haptic memory rules — opt-in, respects portal silence policy).

---

### Suggested build order

If you greenlight everything, sensible sequence:
1. Global Cmd-K search (highest daily impact).
2. Player Database "Squad View" + attribute polygon + row slide-in.
3. Outreach "Scouting Centre" Kanban.
4. Investor portal scenario compare + sparklines.
5. Public site SEO + perf pass.
6. PWA offline + player push notifications.

Tell me which slices to build (any subset is fine) and I'll start with that.

### Out of scope until you confirm

- No schema changes proposed yet. The Squad View, Scouting Centre, and saved views need a small `user_view_presets` table; I'll spec that in the build plan once you pick the slice.
- No removal of existing screens — additions only.
