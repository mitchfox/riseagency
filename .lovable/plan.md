Three focused fixes.

### 1. Request Representation — proper tablet & desktop layout

The page (`src/pages/RequestRepresentation.tsx`) is essentially mobile-only: the hero stretches an image full-bleed, the hub uses a thin `max-w-md` column, and the choice/CTA buttons are not wrapped with the site's hover reveal effect.

Changes:

- **Tablet/desktop redesign with black marble**
  - Replace the stretched hero image background with a proper layered backdrop using `src/assets/black-marble-smudged.png` (cover, with a soft radial gold glow + dark vignette overlay) on `md+` breakpoints. Keep the existing photo as a contained right-hand visual on desktop only (e.g. `lg:grid-cols-[1fr_1fr]`), not as a stretched background.
  - Hub view (`request-hub`): widen the container to `lg:max-w-6xl` on desktop. Replace the cropped header image strip with a marble-backed header card that includes the `RISEWhite` logo + RISE WITH US headline + intro line on the left and a contained, properly aspected image on the right (desktop only). On tablet, the marble header sits full width with no stretched photo behind it.
  - Detail card view: use the same marble backdrop on `md+` and keep the existing two-column content grid.
- **Centralise option cards (Performance, Club Network, Brand, etc.)**
  - In the `CARD_META.map(...)` grid, change the inner flex from left-aligned (`flex-col justify-between`) to centred (`items-center justify-center text-center`). Move the icon circle to the top centre and place subtitle + title centred underneath. Apply at all breakpoints so cards look consistent.
- **Hover text-reveal on buttons**
  - All page buttons (Under 18, Over 18, Start Here, WhatsApp, Open the Form, Start the Conversation, WhatsApp Us) get `hoverEffect` applied. The shared `Button` wraps string children with `<HoverText>` automatically when `hoverEffect` is set, so we just add the prop. For buttons that contain icons + text (e.g. Open the Form with `ArrowRight`), wrap the label string explicitly in `<HoverText text="..." />` so the reveal effect runs on the text only.
- **Over 18 button hover colour**
  - The current Over 18 button uses inline `marbleStyle` and a plain text colour, so on hover the foreground "disappears". Switch it to use the standard outline pattern (`border-primary/50 text-primary hover:text-primary` with `hover:bg-primary/10` and remove the marble inline style). On hover the text remains visible and turns Rise Gold via `text-primary` (HoverText reveal animates a gold sheen over it).
- **After clicking Under 18 / Over 18, header behind RISE WITH US uses smudged black marble**
  - In the hub view header card, replace `<img src={requestRepresentationHero} ... />` background with a `<div>` styled with `background-image: url(black-marble-smudged.png)` on mobile, and on desktop reuse the same marble plus a contained, side-aligned photo (so it's no longer a stretched cover image). The dark linear-gradient overlay stays.

### 2. Video analysis — Restart export button no longer reloads the page

In `src/components/staff/ExportProgressFloat.tsx`, the stalled-state click handler currently calls `window.location.reload()`, which destroys all state.

Changes:

- Track the current `ExportJob` in `backgroundExportService.ts`:
  - Store the latest job passed to `startExportJob` in a module-level `lastJob` ref.
  - Export a new `restartCurrentExport()` helper. It first sets `running = false` to clear the in-flight guard, then re-invokes `startExportJob(lastJob)` with only the still-pending or errored clips (those whose status is not `done` or `skipped` in `activeJob`).
- Update `ExportProgressFloat.tsx` so the stalled-state restart button calls `restartCurrentExport()` instead of `window.location.reload()`. While restarting, show a brief spinner state (re-use the existing `Loader2`).
- Toast: replace the silent reload with `toast.message("Restarting failed clips…")` so the user gets feedback.

This means the user stays on the page, the export retries the blocked clip, and successful clips are not re-processed.

### 3. My Tasks — mobile optimise the Add Task dialog

The dialog in `StaffAccountabilityOverview.tsx` (lines 1108–1242) uses `max-w-2xl` with no height/scroll handling, so on mobile the content overflows the viewport and cannot be scrolled.

Changes to the `<DialogContent>` and inner layout:

- `DialogContent` className: `max-w-2xl w-[95vw] max-h-[92dvh] p-0 flex flex-col` so the dialog respects the viewport height.
- Wrap the form body in a scrollable region: `<div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">…</div>`.
- Make the action footer sticky inside the dialog: `<div className="border-t bg-background px-5 py-3 flex justify-end gap-2 shrink-0">…</div>`. Buttons stay visible while the form scrolls.
- Responsive form grid: change `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4` so Priority/Category/Deadline/Image/Recurring stack on mobile instead of squeezing.
- Assignees block: keep `flex-wrap` but ensure each chip has `text-xs` and `min-h-[32px]` so they remain tappable. No layout overflow on small screens.
- Image preview height: drop from `h-28` to `h-24 sm:h-28` so it doesn't dominate small screens.
- DialogHeader: keep title visible at top with `px-5 pt-5 pb-2 shrink-0`.

This makes the dialog fully scrollable on mobile, keeps the action buttons reachable, and gives a comfortable single-column layout under `sm`.

### Technical notes

- No DB or schema changes.
- No new dependencies; reuses the existing `HoverText` component, `black-marble-smudged.png` asset, and the shared `Button` `hoverEffect` prop.
- `restartCurrentExport` is additive — existing callers of `startExportJob` are unaffected.

### Files touched

- `src/pages/RequestRepresentation.tsx`
- `src/components/staff/ExportProgressFloat.tsx`
- `src/lib/backgroundExportService.ts`
- `src/components/staff/StaffAccountabilityOverview.tsx`
