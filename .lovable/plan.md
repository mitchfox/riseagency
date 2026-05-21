## Goals

Turn the Jobs page from a cramped collapsible list with a modal apply form into a proper editorial job board with shareable role pages, polished cards, and a fuller application flow that lands in staff form submissions.

## Database

New migration:
- Add `slug` (text, unique), `summary` (text, short pitch for cards/OG), `seo_image_url` (text, optional override for social share) to `public.jobs`.
- Backfill `slug` from existing titles (`talent-scout`, `head-of-scouting`).
- New storage bucket `job-applications` (private) with RLS allowing public INSERT (uploads via the apply form) and staff SELECT/DELETE only.

CV uploads are stored in that bucket; the resulting path is saved on the `form_submissions.data.cv_path` and the public CV URL (signed via edge function on staff side) shown in the staff submissions view.

## Routes

- `/jobs` — list page (redesigned cards, no inline expand).
- `/jobs/:slug` — dedicated role page (full description, requirements, responsibilities, apply form rendered in-page below).
- Add localized variants via existing `createLocalizedRoutes` helper.

Old expand/collapse and Apply dialog removed.

## Jobs list redesign (`/jobs`)

Replace the current cramped accordion with a clean two-column grid (single column on mobile) of role cards:

```text
┌─────────────────────────────┐
│ DEPARTMENT · LOCATION       │
│ Role Title (large, gold)    │
│ Short summary line…         │
│ [Full-time] [Remote] [£…]   │
│                  View role →│
└─────────────────────────────┘
```

- Cards use existing token palette (border, primary gold accent, dark surface).
- Whole card clickable, navigates to `/jobs/:slug`.
- Hover: subtle lift + gold border, no layout shift.
- Empty / loading states retained.

## Role page (`/jobs/:slug`)

Layout:
1. Hero band with banner image, breadcrumb (Jobs › Title), title, meta chips (department, location, type, salary), and a Share button that copies the canonical URL with a tooltip + toast ("Link copied"). Share button also exposes WhatsApp / LinkedIn / X quick links via a small popover.
2. Two-column body on desktop (single column mobile):
   - Left: About the Role (description), Responsibilities, Requirements — each rendered with a lightweight markdown renderer so authors can mix paragraphs and bullet lists. Bullets via standard `-` / `*` lines, fully styled (gold marker, comfortable line height).
   - Right: sticky summary card (salary, type, location, quick Apply CTA that scrolls to the form).
3. Apply section rendered **on the page** (no dialog), full-width card with the form.

Authors enter responsibilities/requirements as plain text with `-` bullets and optional intro/outro paragraphs — we render via the existing `markdownRenderer` util.

## Application form (in-page)

Fields:
- Full name (required)
- Email (required, validated)
- Phone (optional)
- LinkedIn / portfolio URL (optional)
- CV upload (optional, PDF/DOC/DOCX, max 10 MB) — uploaded directly to `job-applications` bucket under `{job_slug}/{timestamp}-{filename}`.
- Cover letter / message (optional)
- Zod validation, inline errors, disabled submit while uploading.

On submit: insert into `public.form_submissions` with `form_type = 'job_application'` and `data = { job_id, job_slug, job_title, name, email, phone, link, message, cv_path, cv_filename }`. The existing `log_form_submission_notification` trigger already routes it to staff notifications, and `FormSubmissionsManagement` already renders job_application rows — we add a CV download link when `cv_path` is present (signed URL via a small edge function `get-application-cv`).

Success state replaces the form with a confirmation panel.

## SEO & social sharing

For each role page:
- `SEO` component with title `"{title} — Careers at RISE"`, description from `summary` (or trimmed description), canonical `/jobs/{slug}`.
- OG image: `seo_image_url` override, else `/og-preview-jobs.png`.
- JSON-LD `JobPosting` schema (title, description, hiringOrganization, jobLocation, employmentType, datePosted, baseSalary when present) for rich results.
- `sitemap.xml` entries appended for each active job slug (static generation step in the migration / one-off script).

## Share UI

Share button in hero:
- Primary action: copy link (Lucide `Link2` icon → swap to `Check` for 1.5 s, toast "Link copied").
- Popover with WhatsApp, LinkedIn, X, Email share intents pre-filled with title + URL.
- Tooltip "Share this role" on hover.

## Files touched

- `src/pages/Jobs.tsx` — list redesign, remove dialog/accordion.
- `src/pages/JobRole.tsx` — new role page.
- `src/components/jobs/JobCard.tsx`, `JobShareButton.tsx`, `JobApplyForm.tsx` — new.
- `src/App.tsx` — add `/jobs/:slug` route.
- `src/components/staff/FormSubmissionsManagement.tsx` — show CV link for `job_application` rows.
- `supabase/functions/get-application-cv/index.ts` — staff-only signed URL.
- New migration for `slug`/`summary`/`seo_image_url` + `job-applications` bucket + policies.
- `public/sitemap.xml` — append job URLs (or generate from a small script).

## Out of scope

- Editing job content UI (admin already manages jobs elsewhere — only add `slug`/`summary` inputs if requested next).
- Multi-step application wizard.