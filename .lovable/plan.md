## Diagnosis

Anthony (admin) hits blank screens and stuck spinners on /staff from an iPhone on a Nigerian network. The current `src/pages/Staff.tsx` eagerly imports ~80 section components at the top of the file (PlayerManagement, CoachingDatabase, AnalysisManagement, TransferHub, AthleteCentre, MarketingManagement, etc.). That produces:

- A very large initial JS bundle that must download fully before /staff can render. On a slow / unstable 4G connection this is the classic "white screen, then spinner forever".
- High peak memory on first parse/evaluate. Mobile Safari aggressively reaps tabs that breach its memory ceiling — that looks to the user like the page "broke".
- A single buggy section anywhere in the tree can throw during render and blank the whole page, because the section switch is not wrapped in an error boundary.

His admin role already bypasses `permissionsLoading`, so the root cause is not the permission gating logic — it's bundle weight and missing fault isolation.

## Fix

### 1. Code-split staff sections (biggest win)

Convert the static imports of every heavy section in `src/pages/Staff.tsx` to `React.lazy` and render them inside a single `<Suspense fallback={<PageLoading />}>` wrapper around the section switch. Keep the always-needed shell pieces eager: layout chrome, sidebar, command palette, `StaffOverview`, `LoadingSpinner`, `useStaffNotifications`, breadcrumb, headers.

Lazy candidates (high payload, only one shown at a time):
PlayerManagement, PlayerList, BlogManagement, BetweenTheLinesManagement, CoachingDatabase, AnalysisManagement, ActionReportsList, CoachingDataSection, FormSubmissionsManagement, SiteVisitorsManagement, InvoiceManagement, UpdatesManagement, StaffSchedule, InteractionHistory, StaffAvailabilityManagement, StaffSchedulesManagement, MarketingManagement, ScheduleManager, ContentCreator, SalesDeck, RecruitmentManagement, ScoutingCentreManagement, HighlightMakersManagement, PlayerDatabaseManagement, StaffAccountManagement, PlayerPasswordManagement, ClubNetworkManagement, ClubOutreachManager, LegalManagement, PartnersManagement, LanguagesManagement, SiteTextManagement, TransferHub, ExpensesManagement, TaxRecordsManagement, CorporationTaxSection, BudgetsManagement, FinancialReports, PaymentsManagement, AthleteCentre, OpenAccessManagement, PressReleasesManagement, PublicContentManagement, video/highlight/dataset/music sub-tools, TacticsBoard, Meetings, AnnotationProjects, VideoAnalysis, etc.

This shrinks the initial bundle by an order of magnitude. The dashboard renders fast, then each tab only loads its own chunk when opened.

### 2. Wrap the section switch in an ErrorBoundary

In `src/pages/Staff.tsx`, wrap the big `{expandedSection === '...' && <X />}` block with the existing `ErrorBoundary` (`src/components/ErrorBoundary.tsx`). One section crashing then shows a contained error card with Dismiss / Refresh, instead of blanking the whole portal. Use a `key={expandedSection}` so the boundary resets when he switches tabs.

### 3. Make startup non-blocking on slow connections

- Keep `VersionManager.initialize(true)` but defer it behind `requestIdleCallback` (or a `setTimeout(…, 1500)` fallback) so it never competes with first paint on a slow link.
- In `useStaffNotifications`, drop polling frequency on mobile and pause polling when `document.hidden` is true (already partially done — verify and tighten).

### 4. Stale PWA recovery on iPhone

If he's added the portal to his home screen, an old broken service worker can keep serving a half-broken cache. Add a small "Reset app cache" button on the Access Denied / persistent loading screens that:
- Calls `navigator.serviceWorker.getRegistrations()` → `unregister()` on each
- Clears `caches.keys()` → `caches.delete()`
- Forces `window.location.reload(true)`

Also bump `CACHE_VERSION` in `public/sw.js` so the next deploy invalidates his existing cache.

### 5. Safety: confirm role is actually loading

His `user_roles` row resolves to `admin` (confirmed in DB). Add a single `console.warn` line in `checkExistingSession` when `roleData` is empty so if it ever does return zero rows for him we can see it in his next session — purely diagnostic, no UI change.

## Files touched

- `src/pages/Staff.tsx` — convert heavy imports to `React.lazy`; wrap section switch in `<Suspense>` + `<ErrorBoundary key={expandedSection}>`; defer `VersionManager.initialize`.
- `src/components/staff/StaffOfflineManager.tsx` (or new `StaffCacheReset.tsx`) — add a "Reset app cache" action surfaced on the login / access-denied / stuck-spinner screens of `Staff.tsx`.
- `public/sw.js` — bump `CACHE_VERSION`.
- `src/hooks/useStaffNotifications.ts` — pause polling when tab hidden / on mobile (light tweak only if it's currently always-on).

No DB migration, no schema change, no UX change for admins on a fast connection — the portal looks identical, just loads dramatically faster and isolates failures.

## What this should achieve for Anthony

- First load on iPhone over Nigerian 4G drops from "download ~megabytes of JS before anything renders" to "shell renders in a second, his current tab streams in after".
- If one section (e.g. Coaching, Club Outreach) ever throws on his account, he sees a contained error he can dismiss, instead of a blank page.
- If his old PWA cache is what's broken, he gets a one-tap recovery without uninstalling the app.

After deploy, ask him to: hard-refresh once (or tap Reset app cache), then report which specific tab, if any, still misbehaves — so we can drill into that section instead of guessing.